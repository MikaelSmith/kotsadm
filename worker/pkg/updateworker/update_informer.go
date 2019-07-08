package updateworker

import (
	"context"
	"encoding/base64"
	"fmt"
	"strconv"
	"time"

	"github.com/pkg/errors"
	"github.com/replicatedhq/ship-cluster/worker/pkg/ship"
	"github.com/replicatedhq/ship-cluster/worker/pkg/types"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/tools/cache"
)

var updateSession types.UpdateSession

func (w *Worker) runInformer(ctx context.Context) error {
	restClient := w.K8sClient.CoreV1().RESTClient()
	watchlist := cache.NewListWatchFromClient(restClient, "pods", "", fields.Everything())

	resyncPeriod := 30 * time.Second

	_, controller := cache.NewInformer(watchlist, &corev1.Pod{}, resyncPeriod,
		cache.ResourceEventHandlerFuncs{
			UpdateFunc: func(oldObj interface{}, newObj interface{}) {
				err := w.updateFunc(oldObj, newObj)
				if err != nil {
					w.Logger.Errorw("error in updateworker informer updateFunc", zap.Error(err))
				}
			},
		},
	)

	controller.Run(ctx.Done())
	return ctx.Err()
}

func (w *Worker) updateFunc(oldObj interface{}, newObj interface{}) error {
	oldPod, ok := oldObj.(*corev1.Pod)
	if !ok {
		return fmt.Errorf("unexpected type %T", oldObj)
	}

	newPod, ok := newObj.(*corev1.Pod)
	if !ok {
		return fmt.Errorf("unexpected type %T", newObj)
	}

	shipCloudRole, ok := newPod.ObjectMeta.Labels["shipcloud-role"]
	if !ok || shipCloudRole != updateSession.GetRole() {
		return nil
	}

	id, ok := newPod.ObjectMeta.Labels[updateSession.GetType()]
	if !ok {
		w.Logger.Errorw("updateworker informer, no id found in pod labels", zap.String("pod.name", newPod.Name))
		return nil
	}

	if oldPod.Status.Phase == newPod.Status.Phase {
		return nil
	}

	shipState := ship.NewStateManager(w.Config)
	stateID := newPod.ObjectMeta.Labels["state-id"]
	deleteState := func() {
		if stateID == "" {
			return
		}
		if err := shipState.DeleteState(stateID); err != nil {
			w.Logger.Errorw("failed to delete state from S3", zap.String("state-id", stateID), zap.Error(err))
		}
	}

	if newPod.Status.Phase == corev1.PodFailed {
		defer deleteState()

		if err := w.Store.SetUpdateStatus(context.TODO(), id, "failed"); err != nil {
			return errors.Wrap(err, "set update status to failed")
		}

		// Leaving these sitting around for now...  we should
		// be grabbing the logs from these and writing them to
		// somewhere for analysis of failures

		// if err := w.K8sClient.CoreV1().Namespaces().Delete(newPod.Namespace, &metav1.DeleteOptions{}); err != nil {
		// 	return errors.Wrap(err, "delete namespace")
		// }

	} else if newPod.Status.Phase == corev1.PodSucceeded {
		defer deleteState()

		updateSession, err := w.Store.GetUpdate(context.TODO(), id)
		if err != nil {
			return errors.Wrap(err, "get update session")
		}

		stateJSON, err := shipState.GetState(stateID)
		if err != nil {
			return errors.Wrap(err, "get secret")
		}

		if err := w.Store.UpdateWatchState(context.TODO(), updateSession.WatchID, stateJSON, ship.ShipClusterMetadataFromState(stateJSON)); err != nil {
			return errors.Wrap(err, "update watch from state")
		}

		collectors := ship.TroubleshootCollectorsFromState(stateJSON)
		if err := w.Store.SetWatchTroubleshootCollectors(context.TODO(), updateSession.WatchID, collectors); err != nil {
			return errors.Wrap(err, "set troubleshoot collectors")
		}
		analyzers := ship.TroubleshootAnalyzersFromState(stateJSON)
		if err := w.Store.SetWatchTroubleshootAnalyzers(context.TODO(), updateSession.WatchID, analyzers); err != nil {
			return errors.Wrap(err, "set troubleshoot collectors")
		}

		if err := w.Store.SetUpdateStatus(context.TODO(), id, "completed"); err != nil {
			return errors.Wrap(err, "set update status to completed")
		}

		if err := w.K8sClient.CoreV1().Namespaces().Delete(newPod.Namespace, &metav1.DeleteOptions{}); err != nil {
			return errors.Wrap(err, "delete namespace")
		}

		s3Filepath, ok := newPod.ObjectMeta.Labels["s3-filepath"]
		if !ok {
			w.Logger.Errorw("updateworker informer, no s3filepath found in pod labels", zap.String("pod.name", newPod.Name))
			return nil
		}
		decodedS3Filepath, err := base64.RawStdEncoding.DecodeString(s3Filepath)
		if err != nil {
			return errors.Wrap(err, "decode filepath")
		}

		updateSequenceStr, ok := newPod.ObjectMeta.Labels["update-sequence"]
		if !ok {
			w.Logger.Errorw("updateworker informer, no updatesequence found in pod labels", zap.String("pod.name", newPod.Name))
			return nil
		}
		updateSequence, err := strconv.Atoi(string(updateSequenceStr))
		if err != nil {
			w.Logger.Errorw("updateworker informer, unable to convert update sequence from string", zap.String("updateSequenceStr", updateSequenceStr), zap.String("pod.name", newPod.Name))
			return nil
		}

		if err := w.postUpdateActions(updateSession.WatchID, updateSequence, string(decodedS3Filepath)); err != nil {
			return errors.Wrap(err, "postUpdateActions")
		}
	}

	return nil
}