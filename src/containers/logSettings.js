import React, { useEffect } from 'react';
import { Button, Form, Input, Label, Row, Table } from 'reactstrap';
import Load from '../util/load';
import { firstName } from '../util/helpers';
import { create } from 'zustand';
import { warning } from '../components/toastAlerts';


const useSettingLogs = create((set) => {
  return {
    query: {
      "name": "",
      "timestampPost": null,
      "timestampAnte": null,
      "user": "",
    },
    queryChanged: true,
    results: [],
    resultsFetched: false,
    nameList: [],
    downloadInProgress: false,
    updateDownloadInProgress: (inProgress) => set({ downloadInProgress: inProgress }),

    setQuery: (query) => set({ query }),
    markQueryChanged: (changed) => set({ queryChanged: changed }),
    resetQuery: () => set({ query: {
          "name": "",
          "timestampPost": null,
          "timestampAnte": null,
          "user": "",
        }
      }),
    updateResults: (results) => set({ results }),
    clearResults: () => set({ results: [] }),
    updateResultsFetched: (resultsFetched) => set({ resultsFetched }),
    updateNameList: (nameList) => set({ nameList }),
  }
});

const SettingLogs = () => {
  const state = useSettingLogs();

  const handleQueryChange = (e, query) => {
    e.preventDefault();
    state.setQuery(query);
    state.markQueryChanged(true);
  };

  const handleSearch = async () => {
    state.clearResults();
    const results = await Load.searchSettingLogs(state.query);
    if (results && results.length > 0) {
      state.updateResults(results);
    }
    else {
      state.updateResults([]);
      warning('No results found');
    }
    state.markQueryChanged(false);
  };

  const handleCsvDownload = async () => {
    try {
      state.updateDownloadInProgress(true);

      const blob = await Load.downloadSettingLogs(state.query);
      const url = window.URL.createObjectURL(blob);

      // Create a temporary <a> tag and open in new tab
      const a = document.createElement('a');
      a.href = url;
      a.download = `setting-logs-${new Date().toISOString().slice(0,10)}.csv`;
      a.target = '_blank'; // open in new tab
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      state.updateDownloadInProgress(false);
    }
    catch (error) {
      console.error('Error downloading CSV:', error);
      state.updateDownloadInProgress(false);
      warning('Error downloading CSV');
    }
  };

  // Get list of user names
  useEffect(() => {
    Load.getNameList().then((nameList) => {state.updateNameList(nameList)});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <SearchForm
        query={state.query}
        nameList={state.nameList}
        queryChanged={state.queryChanged}
        handleQueryChange={handleQueryChange}
        handleSearch={handleSearch}
        handleCsvDownload={handleCsvDownload}
        downloadInProgress={state.downloadInProgress}
      />
      <div style={{marginTop: "20px"}}>
        { state.results && state.results.length
          ? (state.results.length >= 100
              ? <><p style={{"marginTop": "10px"}}><em>Results are limited to the most recent 100. Download a CSV to access the full list of results.</em></p><ResultDisplay data={state.results} nameList={state.nameList} /></>
              : <ResultDisplay data={state.results} nameList={state.nameList} />
            )
          : null
        }
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form inline style={{"float": "left", "width": "100%", "position": "relative"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 2
      }}>
        <Button
          color={props.downloadInProgress ? "secondary" : "success"}
          disabled={props.downloadInProgress}
          style={{
            margin: "0",
            cursor: props.downloadInProgress ? "wait" : "pointer"
          }}
          onClick={props.handleCsvDownload}
        >
          Download CSV
        </Button>
      </div>
      <Row style={{"display": "flex", "paddingBottom": "10px", "paddingLeft": "15px", "paddingRight": "20px", "width": "100%"}}>
        <Button color={props.queryChanged ? "primary" : "secondary"} style={{"marginRight": "10px"}}>Search setting logs</Button>
        <Label for="timestampPost" style={{"marginRight": "10px"}}>From</Label>
        <Input
          type="date"
          style={{"marginRight": "10px"}}
          id="timestampPost"
          name="timestampPost"
          value={props.timestampPost}
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "timestampPost": e.target.value
          })}
        />
        <Label for="timestampAnte" style={{"marginRight": "10px"}}>Until</Label>
        <Input
          type="date"
          style={{"marginRight": "10px"}}
          id="timestampAnte"
          name="timestampAnte"
          value={props.timestampAnte}
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "timestampAnte": e.target.value
          })}
        />
      </Row>
      <Row style={{"display": "flex", "paddingBottom": "10px", "paddingLeft": "15px", "paddingRight": "20px"}}>
        <Input
          type="text"
          style={{"marginRight": "10px"}}
          name="name"
          placeholder="Name"
          value={props.name}
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "name": e.target.value
          })}
        />
        <Input
          type="select"
          style={{"marginRight": "10px"}}
          name="user"
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "user": e.target.value
          })}
        >
          <option value="">-- User --</option>
          { props.nameList.map((name, idx) =>
              <option key={idx} value={name}>{firstName(name, props.nameList)}</option>
            )
          }
        </Input>
      </Row>
    </Form>
  );
};

const ResultDisplay = ({ data, nameList }) => (
  <Table responsive striped>
    <TableHead />
    <tbody>
      { data.map((log, idx) =>
          <TableRow
            log={log}
            key={idx}
            nameList={nameList}
          />
        )
      }
    </tbody>
  </Table>
)

const TableHead = () => (
  <thead>
    <tr>
      <th>Setting log ID</th>
      <th>Name</th>
      <th>Value</th>
      <th>User</th>
      <th>Timestamp</th>
    </tr>
  </thead>
)

const TableRow = ({ log, idx, nameList }) => (
  <tr key={idx}>
    <td>{log.id}</td>
    <td>{log.name}</td>
    <td>{log.value}</td>
    <td style={{ whiteSpace: "nowrap" }}>{firstName(log.user, nameList)}</td>
    <td>{log.timestamp}</td>
  </tr>
)

export default SettingLogs;
