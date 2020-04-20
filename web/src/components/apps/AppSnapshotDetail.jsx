import React, { Component } from "react";
import { graphql, compose, withApollo } from "react-apollo";
import { Link, withRouter } from "react-router-dom";
import MonacoEditor from "react-monaco-editor";
import Modal from "react-modal";
import filter from "lodash/filter";
import isEmpty from "lodash/isEmpty";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import { saveAs } from "file-saver";

import Loader from "../shared/Loader";
import { snapshotDetail } from "../../queries/SnapshotQueries";
import ShowAllModal from "../modals/ShowAllModal";
import { Utilities } from "../../utilities/utilities";

class AppSnapshotDetail extends Component {
  state = {
    showScriptsOutput: false,
    scriptOutput: "",
    selectedTab: "stdout",
    showAllVolumes: false,
    selectedScriptTab: "Pre-snapshot scripts",
    showAllPreSnapshotScripts: false,
    showAllPostSnapshotScripts: false,
    selectedErrorsWarningTab: "Errors",
    showAllWarnings: false,
    showAllErrors: false,
    snapshotDetails: {},
    series: [],

    options: {
      chart: {
        height: 140,
        type: "rangeBar",
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          dataLabels: {
            hideOverflowingLabels: false
          }
        }
      },
      xaxis: {
        type: "datetime",
        labels: {
          formatter: (value) => {
            return moment(value).format("h:mm:ss");
          }
        }
      },
      yaxis: {
        show: false
      },
      grid: {
        xaxis: {
          lines: {
            show: true
          },
        },
        yaxis: {
          lines: {
            show: false
          }
        },
      },
      tooltip: {
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
          return (
            '<div class="arrow_box">' +
            '<p class="u-color--tuna u-fontSize--normal u-fontWeight--medium">' +
            w.globals.labels[dataPointIndex] +
            "</p>" +
            '<span class="u-fontSize--normal u-fontWeight--normal u-color--dustyGray u-marginTop--10">' +
            w.globals.seriesZ[seriesIndex][dataPointIndex] + "</span>" +
            "<br />" +
            "<br />" +
            '<span class="u-fontSize--normal u-fontWeight--normal u-color--dustyGray u-marginTop--10">' +
            "Started at " + moment(w.globals.seriesRangeStart[seriesIndex][dataPointIndex]).format("h:mm:ss") + "</span>" +
            "<br />" +
            '<span class="u-fontSize--normal u-fontWeight--normal u-color--dustyGray">' +
            "Finished at " + moment(w.globals.seriesRangeEnd[seriesIndex][dataPointIndex]).format("h:mm:ss") + "</span>" +
            "</div>"
          );
        }
      }
    }
  };

  componentDidMount() {
    if (this.props.snapshotDetail) {
      this.setState({ snapshotDetails: this.props.snapshotDetail?.snapshotDetail });
    }
  }

  componentDidUpdate(lastProps) {
    if (this.props.snapshotDetail?.snapshotDetail !== lastProps.snapshotDetail?.snapshotDetail && this.props.snapshotDetail?.snapshotDetail) {
      this.setState({ snapshotDetails: this.props.snapshotDetail?.snapshotDetail });
      if (!isEmpty(this.props.snapshotDetail?.snapshotDetail?.volumes)) {
        if (this.props.snapshotDetail?.snapshotDetail?.hooks && !isEmpty(this.props.snapshotDetail?.snapshotDetail?.hooks)) {
          this.setState({ series: this.getSeriesData([...this.props.snapshotDetail?.snapshotDetail?.volumes, ...this.props.snapshotDetail?.snapshotDetail?.hooks].sort((a, b) => new Date(a.started) - new Date(b.started))) })
        } else {
          this.setState({ series: this.getSeriesData((this.props.snapshotDetail?.snapshotDetail?.volumes).sort((a, b) => new Date(a.started) - new Date(b.started))) })
        }
      }
    }
  }

  preSnapshotScripts = () => {
    return filter(this.state.snapshotDetails?.hooks, (hook) => {
      return hook.phase === "pre";
    });
  }

  postSnapshotScripts = () => {
    return filter(this.state.snapshotDetails?.hooks, (hook) => {
      return hook.phase === "post";
    });
  }

  toggleShowAllPreScripts = () => {
    this.setState({ showAllPreSnapshotScripts: !this.state.showAllPreSnapshotScripts });
  }

  toggleShowAllPostScripts = () => {
    this.setState({ showAllPostSnapshotScripts: !this.state.showAllPostSnapshotScripts });
  }

  toggleShowAllVolumes = () => {
    this.setState({ showAllVolumes: !this.state.showAllVolumes });
  }

  toggleScriptsOutput = output => {
    if (this.state.toggleScriptsOutput) {
      this.setState({ showScriptsOutput: false, scriptOutput: "" });
    } else {
      this.setState({ showScriptsOutput: true, scriptOutput: output });
    }
  }

  toggleShowAllWarnings = () => {
    this.setState({ showAllWarnings: !this.state.showAllWarnings });
  }

  toggleShowAllErrors = () => {
    this.setState({ showAllErrors: !this.state.showAllErrors });
  }

  downloadLogs = () => {
    const name = this.state.snapshotDetails?.name;
    const url = `${window.env.API_ENDPOINT}/snapshot/${name}/logs`;
    fetch(url, {
      headers: {
        "Authorization": `${Utilities.getToken()}`
      },
      method: "GET",
    })
      .then(async (response) => {
        const blob = await response.blob();
        saveAs(blob, "snapshot-logs.gz")
      })
      .catch((err) => {
        throw err;
      });
  }

  renderOutputTabs = () => {
    const { selectedTab } = this.state;
    const tabs = ["stdout", "stderr"];
    return (
      <div className="flex action-tab-bar u-marginTop--10">
        {tabs.map(tab => (
          <div className={`tab-item ${tab === selectedTab && "is-active"}`} key={tab} onClick={() => this.setState({ selectedTab: tab })}>
            {tab}
          </div>
        ))}
      </div>
    );
  }

  renderShowAllVolumes = (volumes) => {
    return (
      volumes.map((volume) => {
        const diffMinutes = moment(volume?.finished).diff(moment(volume?.started), "minutes");
        return (
          <div className="flex flex1 u-borderBottom--gray alignItems--center" key={volume.name}>
            <div className="flex1 u-paddingBottom--15 u-paddingTop--15 u-paddingLeft--10">
              <p className="flex1 u-fontSize--large u-color--tuna u-fontWeight--bold u-lineHeight--bold u-marginBottom--8">{volume.name}</p>
              <p className="u-fontSize--normal u-color--doveGray u-fontWeight--bold u-lineHeight--normal u-marginRight--20">Size:
            <span className="u-fontWeight--normal u-color--dustyGray"> {volume.doneBytesHuman}/{volume.sizeBytesHuman} </span>
              </p>
            </div>
            <div className="flex flex-column justifyContent--flexEnd">
              <p className="u-fontSize--small u-fontWeight--normal alignSelf--flexEnd u-marginBottom--8"><span className={`status-indicator ${volume?.phase?.toLowerCase()} u-marginLeft--5`}>{volume.phase}</span></p>
              <p className="u-fontSize--small u-fontWeight--normal"> Finished in {diffMinutes === 0 ? "less than a minute" : `${diffMinutes} minutes`} </p>
            </div>
          </div>
        )
      })
    );
  }

  renderScriptsTabs = () => {
    const { selectedScriptTab } = this.state;
    const tabs = ["Pre-snapshot scripts", "Post-snapshot scripts"];
    return (
      <div className="flex action-tab-bar u-marginTop--10">
        {tabs.map(tab => (
          <div className={`tab-item ${tab === selectedScriptTab && "is-active"}`} key={tab} onClick={() => this.setState({ selectedScriptTab: tab })}>
            {tab}
          </div>
        ))}
      </div>
    );
  }

  renderErrorsWarningsTabs = () => {
    const { snapshotDetails, selectedErrorsWarningTab } = this.state;
    const tabs = ["Errors", "Warnings"];
    return (
      <div className="flex action-tab-bar u-marginTop--10">
        {tabs.map(tab => (
          <div className={`tab-item ${tab === selectedErrorsWarningTab && "is-active"}`} key={tab} onClick={() => this.setState({ selectedErrorsWarningTab: tab })}>
            {tab}
            {tab === "Errors" ?
              <span className="errors u-marginLeft--5"> {snapshotDetails?.errors?.length} </span> : <span className="warnings u-marginLeft--5"> {snapshotDetails?.warnings?.length} </span>}
          </div>
        ))}
      </div>
    );
  }

  renderShowAllScripts = (hooks) => {
    return (
      hooks.map((hook, i) => {
        const diffMinutes = moment(hook?.finished).diff(moment(hook?.started), "minutes");
        return (
          <div className="flex flex1 u-borderBottom--gray alignItems--center" key={`${hook.hookName}-${hook.phase}-${i}`}>
            <div className="flex flex1 u-paddingBottom--15 u-paddingTop--15 u-paddingLeft--10">
              <div className="flex flex-column">
                <p className="u-fontSize--large u-color--tuna u-fontWeight--bold u-lineHeight--bold u-marginBottom--8">{hook.hookName} <span className="u-fontSize--small u-fontWeight--medium u-color--dustyGray u-marginLeft--5">Pod: {hook.podName} </span> </p>
                <span className="u-fontSize--small u-fontWeight--normal u-color--dustyGray u-marginRight--10"> {hook.command} </span>
              </div>
            </div>
            <div className="flex flex-column justifyContent--flexEnd">
              <p className="u-fontSize--small u-fontWeight--normal alignSelf--flexEnd u-marginBottom--8"><span className={`status-indicator ${hook.errors ? "failed" : "completed"} u-marginLeft--5`}>{hook.errors ? "Failed" : "Completed"}</span></p>
              {!hook.errors &&
                <p className="u-fontSize--small u-fontWeight--normal u-marginBottom--8"> Finished in {diffMinutes === 0 ? "less than a minute" : `${diffMinutes} minutes`} </p>}
              {hook.stderr !== "" || hook.stdout !== "" &&
                <span className="replicated-link u-fontSize--small alignSelf--flexEnd" onClick={() => this.toggleScriptsOutput(hook)}> View output </span>}
            </div>
          </div>
        )
      })
    );
  }

  renderShowAllWarnings = (warnings) => {
    return (
      warnings.map((warning, i) => (
        <div className="flex flex1 u-borderBottom--gray" key={`${warning.title}-${i}`}>
          <div className="flex1">
            <p className="u-fontSize--large u-color--tuna u-fontWeight--bold u-lineHeight--bold u-paddingBottom--10 u-paddingTop--10 u-paddingLeft--10">{warning.title}</p>
          </div>
        </div>
      ))
    );
  }

  renderShowAllErrors = (errors) => {
    return (
      errors.map((error, i) => (
        <div className="flex flex1 u-borderBottom--gray" key={`${error.title}-${i}`}>
          <div className="flex1 u-paddingBottom--10 u-paddingTop--10 u-paddingLeft--10">
            <p className="u-fontSize--large u-color--chestnut u-fontWeight--bold u-lineHeight--bold u-marginBottom--8">{error.title}</p>
            <p className="u-fontSize--normal u-fontWeight--normal u-color--dustyGray"> {error.message} </p>
          </div>
        </div>
      ))
    );
  }

  calculateTimeInterval = (data) => {
    const startedTimes = data.map((d) => moment(d.started).format("MMM D, YYYY h:mm A"));
    const finishedTimes = data.map((d) => moment(d.finished).format("MMM D, YYYY h:mm A"));
    const minStarted = startedTimes?.length ? startedTimes.reduce((a, b) => { return a <= b ? a : b; }) : "";
    const maxFinished = finishedTimes?.length ? finishedTimes.reduce((a, b) => { return a <= b ? b : a; }) : "";

    const diffHours = moment(maxFinished).diff(moment(minStarted), "hours")
    const diffMinutes = moment(maxFinished).diff(moment(minStarted), "minutes");

    return {
      "minStarted": minStarted,
      "maxFinished": maxFinished,
      "maxHourDifference": diffHours,
      "maxMinDifference": diffMinutes
    }
  }

  getSeriesData = (seriesData) => {
    const colors = ["#32C5FF", "#44BB66", "#6236FF", "#F7B500", "#4999AD", "#ED2D2D", "#6236FF",];
    const series = [{ data: null }]
    if (!seriesData) {
      return series;
    }

    const data = seriesData.map((d, i) => {
      return {
        x: d.name ? `${d.name}` : `${d.hookName} (${d.podName})-${i}`,
        y: [new Date(d.started).getTime(), new Date(d.finished).getTime()],
        z: d.name ? "Volume" : `${d.phase}-snapshot-script`,
        fillColor: colors[i]
      }
    });
    series[0].data = data;
    return series;
  }

  renderTimeInterval = () => {
    let data;
    if (!isEmpty(this.state.snapshotDetails?.volumes)) {
      if (!isEmpty(this.state.snapshotDetails?.hooks)) {
        data = [...this.state.snapshotDetails?.volumes, ...this.state.snapshotDetails?.hooks];
      } else {
        data = this.state.snapshotDetails?.volumes;
      }
    }
    return (
      <div className="flex flex1">
        <div className="flex flex1">
          <p className="u-fontSize--normal u-fontWeight--normal u-color--dustyGray">
            Started: <span className="u-fontWeight--bold u-color--doveGray"> {this.calculateTimeInterval(data).minStarted}</span>
          </p>
        </div>
        <div className="flex flex1 justifyContent--center">
          {this.calculateTimeInterval(data).maxHourDifference === 0 && this.calculateTimeInterval(data).maxMinDifference === 0 ?
            <p className="u-fontSize--small u-fontWeight--normal u-color--dustyGray">
              Total capture time: <span className="u-fontWeight--bold u-color--doveGray">less than a minute</span>
            </p>
            :
            <p className="u-fontSize--small u-fontWeight--normal u-color--dustyGray">
              Total capture time: <span className="u-fontWeight--bold u-color--doveGray">{`${this.calculateTimeInterval(data).maxHourDifference} hr `}</span>
              <span className="u-fontWeight--bold u-color--doveGray">{`${this.calculateTimeInterval(data).maxMinDifference} min `}</span>
            </p>
          }
        </div>
        <div className="flex flex1 justifyContent--flexEnd">
          <p className="u-fontSize--normal u-fontWeight--normal u-color--dustyGray">
            Finished: <span className="u-fontWeight--bold u-color--doveGray"> {this.calculateTimeInterval(data).maxFinished} </span>
          </p>
        </div>
      </div>
    )
  }


  render() {
    const {
      showScriptsOutput,
      selectedTab,
      selectedScriptTab,
      scriptOutput,
      showAllVolumes,
      showAllPreSnapshotScripts,
      showAllPostSnapshotScripts,
      selectedErrorsWarningTab,
      showAllErrors,
      showAllWarnings,
      snapshotDetails,
      series } = this.state;
    const { app, snapshotDetail } = this.props;

    if (snapshotDetail?.loading) {
      return (
        <div className="flex-column flex1 alignItems--center justifyContent--center">
          <Loader size="60" />
        </div>)
    }


    return (
      <div className="container flex-column flex1 u-overflow--auto u-paddingTop--30 u-paddingBottom--20">
        <p className="u-marginBottom--30 u-fontSize--small u-color--tundora u-fontWeight--medium">
          <Link to={`/app/${app?.slug}/snapshots`} className="replicated-link">Snapshots</Link>
          <span className="u-color--dustyGray"> > </span>
          {snapshotDetails?.name}
        </p>
        <div className="flex justifyContent--spaceBetween alignItems--center u-paddingBottom--30 u-borderBottom--gray">
          <div className="flex-column u-lineHeight--normal">
            <p className="u-fontSize--larger u-fontWeight--bold u-color--tuna u-marginBottom--5">{snapshotDetails?.name}</p>
            <p className="u-fontSize--normal u-fontWeight--normal u-color--dustyGray">Total size: <span className="u-fontWeight--bold u-color--doveGray">{snapshotDetails?.volumeSizeHuman}</span></p>
          </div>
          <div className="flex-column u-lineHeight--normal u-textAlign--right">
            <p className="u-fontSize--normal u-fontWeight--normal u-marginBottom--5">Status: <span className={`status-indicator ${snapshotDetails?.status.toLowerCase()} u-marginLeft--5`}>{Utilities.snapshotStatusToDisplayName(snapshotDetails?.status)}</span></p>
            <div className="u-fontSize--small">
              {snapshotDetails?.status !== "InProgress" &&
                <span className="replicated-link" onClick={() => this.downloadLogs()}>Download logs</span>}
            </div>
          </div>
        </div>

        {snapshotDetails?.status === "InProgress" ?
          <div className="flex flex-column alignItems--center u-marginTop--60">
            <span className="icon blueWarningIcon" />
            <p className="u-fontSize--larger u-fontWeight--bold u-color--tuna u-marginTop--20"> This snapshot has not completed yet, check back soon </p>
          </div>
          :
          <div>
            {!isEmpty(snapshotDetails?.volumes) ?
              <div className="flex-column flex-auto u-marginTop--30 u-marginBottom--40">
                <p className="u-fontSize--larger u-fontWeight--bold u-color--tuna u-marginBottom--10">Snapshot timeline</p>
                <div className="flex1" id="chart">
                  <ReactApexChart options={this.state.options} series={series} type="rangeBar" height={140} />
                  {this.renderTimeInterval()}
                </div>
              </div> : null}

            <div className="flex flex-auto u-marginBottom--30">
              <div className="flex-column flex1 u-marginRight--20">
                <div className="dashboard-card-wrapper flex1">
                  <div className="flex flex1 alignItems--center u-paddingBottom--10 u-borderBottom--gray">
                    <p className="u-fontSize--larger u-color--tuna u-fontWeight--bold u-lineHeight--bold">Volumes</p>
                    {snapshotDetails?.volumes?.length > 3 ?
                      <div className="flex flex1 justifyContent--flexEnd">
                        <span className="replicated-link u-fontSize--small" onClick={() => this.toggleShowAllVolumes()}>Show all {snapshotDetails?.volumes?.length} volumes</span>
                      </div> : null
                    }
                  </div>
                  {!isEmpty(snapshotDetails?.volumes) ?
                    this.renderShowAllVolumes(snapshotDetails?.volumes?.slice(0, 3))
                    :
                    <div className="flex flex1 u-paddingTop--20 alignItems--center justifyContent--center">
                      <p className="u-fontSize--large u-fontWeight--normal u-color--dustyGray"> No volumes to display </p>
                    </div>}
                </div>
              </div>
            </div>

            <div className="flex flex-auto u-marginBottom--30">
              <div className="flex-column flex1 u-marginRight--20">
                <div className="dashboard-card-wrapper flex1">
                  <div className="flex flex-column u-paddingBottom--10 u-borderBottom--gray">
                    <div className="flex flex1">
                      <p className="u-fontSize--larger u-color--tuna u-fontWeight--bold u-lineHeight--bold u-paddingBottom--10 flex flex1">Scripts</p>
                      {this.preSnapshotScripts()?.length > 3 && selectedScriptTab === "Pre-snapshot scripts" ?
                        <div className="flex flex1 justifyContent--flexEnd">
                          <span className="replicated-link u-fontSize--small" onClick={() => this.toggleShowAllPreScripts()}>Show all {this.preSnapshotScripts()?.length} pre-scripts</span>
                        </div> : null}
                      {this.postSnapshotScripts()?.length > 3 && selectedScriptTab === "Post-snapshot scripts" ?
                        <div className="flex flex1 justifyContent--flexEnd">
                          <span className="replicated-link u-fontSize--small" onClick={() => this.toggleShowAllPostScripts()}>Show all {this.postSnapshotScripts()?.length} post-scripts</span>
                        </div> : null}
                    </div>
                    <div className="flex-column flex1">
                      {this.renderScriptsTabs()}
                    </div>
                  </div>
                  <div>
                    {selectedScriptTab === "Pre-snapshot scripts" ?
                      !isEmpty(this.preSnapshotScripts()) ?
                        this.renderShowAllScripts(this.preSnapshotScripts().slice(0, 3))
                        :
                        <div className="flex flex1 u-paddingTop--20 alignItems--center justifyContent--center">
                          <p className="u-fontSize--large u-fontWeight--normal u-color--dustyGray"> No pre-snapshot scripts to display </p>
                        </div>
                      : selectedScriptTab === "Post-snapshot scripts" &&
                        !isEmpty(this.postSnapshotScripts()) ?
                        this.renderShowAllScripts(this.postSnapshotScripts().slice(0, 3))
                        :
                        <div className="flex flex1 u-paddingTop--20 alignItems--center justifyContent--center">
                          <p className="u-fontSize--large u-fontWeight--normal u-color--dustyGray"> No post-snapshot scripts to display </p>
                        </div>}
                  </div>
                </div>
              </div>
            </div>


            <div className="flex flex-auto u-marginBottom--30">
              <div className="flex-column flex1 u-marginRight--20">
                <div className="dashboard-card-wrapper flex1">
                  <div className="flex flex-column u-paddingBottom--10 u-borderBottom--gray">
                    <div className="flex flex1">
                      <p className="u-fontSize--larger u-color--tuna u-fontWeight--bold u-lineHeight--bold u-paddingBottom--10 flex flex1">Errors and warnings</p>
                      {snapshotDetails?.errors?.length > 3 && selectedErrorsWarningTab === "Errors" ?
                        <div className="flex flex1 justifyContent--flexEnd">
                          <span className="replicated-link u-fontSize--small" onClick={() => this.toggleShowAllErrors()}>Show all {snapshotDetails?.errors?.length} errors </span>
                        </div> : null}
                      {snapshotDetails?.warnings?.length > 3 && selectedErrorsWarningTab === "Warnings" ?
                        <div className="flex flex1 justifyContent--flexEnd">
                          <span className="replicated-link u-fontSize--small" onClick={() => this.toggleShowAllWarnings()}>Show all {snapshotDetails?.warnings?.length} warnings </span>
                        </div> : null}
                    </div>
                    <div className="flex-column flex1">
                      {this.renderErrorsWarningsTabs()}
                    </div>
                  </div>
                  <div>
                    {selectedErrorsWarningTab === "Errors" ?
                      !isEmpty(snapshotDetails?.errors) ?
                        this.renderShowAllErrors(snapshotDetails?.errors.slice(0, 3))
                        :
                        <div className="flex flex1 u-paddingTop--20 alignItems--center justifyContent--center">
                          <p className="u-fontSize--large u-fontWeight--normal u-color--dustyGray"> No errors to display </p>
                        </div>
                      : selectedScriptTab === "Warnings" &&
                        !isEmpty(snapshotDetails?.warnings) ?
                        this.renderShowAllWarnings(snapshotDetails?.warnings?.slice(0, 3))
                        :
                        <div className="flex flex1 u-paddingTop--20 alignItems--center justifyContent--center">
                          <p className="u-fontSize--large u-fontWeight--normal u-color--dustyGray"> No warnings to display </p>
                        </div>}
                  </div>
                </div>
              </div>
            </div>
          </div>}

        {showScriptsOutput && scriptOutput &&
          <Modal
            isOpen={showScriptsOutput}
            onRequestClose={() => this.toggleScriptsOutput()}
            shouldReturnFocusAfterClose={false}
            contentLabel="View logs"
            ariaHideApp={false}
            className="Modal logs-modal"
          >
            <div className="Modal-body flex flex1 flex-column">
              {!selectedTab ?
                <div className="flex-column flex1 alignItems--center justifyContent--center">
                  <Loader size="60" />
                </div>
                :
                <div className="flex-column flex1">
                  {this.renderOutputTabs()}
                  <div className="flex-column flex1 u-border--gray monaco-editor-wrapper">
                    <MonacoEditor
                      language="json"
                      value={scriptOutput[selectedTab]}
                      height="100%"
                      width="100%"
                      options={{
                        readOnly: true,
                        contextmenu: false,
                        minimap: {
                          enabled: false
                        },
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </div>
              }
              <div className="u-marginTop--20 flex">
                <button type="button" className="btn primary blue" onClick={() => this.toggleScriptsOutput()}>Ok, got it!</button>
              </div>
            </div>
          </Modal>
        }
        {showAllVolumes &&
          <ShowAllModal
            displayShowAllModal={showAllVolumes}
            toggleShowAllModal={this.toggleShowAllVolumes}
            dataToShow={this.renderShowAllVolumes(snapshotDetails?.volumes)}
            name="Volumes"
          />
        }
        {showAllPreSnapshotScripts &&
          <ShowAllModal
            displayShowAllModal={showAllPreSnapshotScripts}
            toggleShowAllModal={this.toggleShowAllPreScripts}
            dataToShow={this.renderShowAllScripts(this.preSnapshotScripts())}
            name="Pre-snapshot scripts"
          />
        }
        {showAllPostSnapshotScripts &&
          <ShowAllModal
            displayShowAllModal={showAllPostSnapshotScripts}
            toggleShowAllModal={this.toggleShowAllPostScripts}
            dataToShow={this.renderShowAllPostscripts(this.postSnapshotScripts())}
            name="Post-snapshot scripts"
          />
        }
        {showAllWarnings &&
          <ShowAllModal
            displayShowAllModal={showAllWarnings}
            toggleShowAllModal={this.toggleShowAllWarnings}
            dataToShow={this.renderShowAllWarnings(snapshotDetails?.warnings)}
            name="Warnings"
          />
        }
        {showAllErrors &&
          <ShowAllModal
            displayShowAllModal={showAllErrors}
            toggleShowAllModal={this.toggleShowAllErrors}
            dataToShow={this.renderShowAllErrors(snapshotDetails?.errors)}
            name="Errors"
          />
        }
      </div>
    );
  }
}

export default compose(
  withApollo,
  withRouter,
  graphql(snapshotDetail, {
    name: "snapshotDetail",
    options: ({ match }) => {
      const slug = match.params.slug;
      const id = match.params.id;
      return {
        variables: { slug, id },
        fetchPolicy: "no-cache"
      }
    }
  })
)(AppSnapshotDetail);