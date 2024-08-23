import React, { useEffect } from 'react';
import { Button, Form, Input, Label, Row, Table } from 'reactstrap';
// import BootstrapTable from 'react-bootstrap-table-next';
import Load from '../util/load';
import { firstName } from '../util/helpers';
import { create } from 'zustand';
import { warning } from '../components/toastAlerts';


const useShelfLogs = create((set) => {
  return {
    query: {
      "barcode": "",
      "timestampPost": null,
      "timestampAnte": null,
      "user": "",
      "action": null,
      "details": "",
    },
    queryChanged: true,
    results: [],
    resultsFetched: false,
    actionList: [],
    nameList: [],

    setQuery: (query) => set({ query }),
    markQueryChanged: (changed) => set({ queryChanged: changed }),
    resetQuery: () => set({ query: {
          "barcode": "",
          "timestampPost": null,
          "timestampAnte": null,
          "user": "",
          "action": null,
          "details": "",
        }
      }),
    updateResults: (results) => set({ results }),
    clearResults: () => set({ results: [] }),
    updateResultsFetched: (resultsFetched) => set({ resultsFetched }),
    updateActionList: (actionList) => set({ actionList }),
    updateNameList: (nameList) => set({ nameList }),
  }
});

const ShelfLogs = () => {
  const state = useShelfLogs();

  const handleQueryChange = (e, query) => {
    e.preventDefault();
    state.setQuery(query);
    state.markQueryChanged(true);
  };

  const handleSearch = async () => {
    state.clearResults();
    const results = await Load.searchShelfLogs(state.query);
    if (results && results.length > 0) {
      state.updateResults(results);
    }
    else {
      state.updateResults([]);
      warning('No results found');
    }
    state.markQueryChanged(false);
  };

  // Get list of all actions
  useEffect(() => {
    Load.getShelfActions().then((actionList) => {state.updateActionList(actionList)});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get list of user names
  useEffect(() => {
    Load.getNameList().then((nameList) => {state.updateNameList(nameList)});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <SearchForm
        query={state.query}
        actionList={state.actionList}
        nameList={state.nameList}
        queryChanged={state.queryChanged}
        handleQueryChange={handleQueryChange}
        handleSearch={handleSearch}
      />
      <div style={{marginTop: "20px"}}>
        { state.results && state.results.length
          ? (state.results.length >= 100
              ? <><p style={{"marginTop": "10px"}}><em>Results are limited to the most recent 100.</em></p><ResultDisplay data={state.results} /></>
              : <ResultDisplay data={state.results} />
            )
          : null
        }
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form inline style={{"float": "left", "width": "100%"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <Row style={{"display": "flex", "paddingBottom": "10px", "paddingLeft": "15px", "paddingRight": "20px"}}>
        <Button color={props.queryChanged ? "primary" : "secondary"} style={{"marginRight": "10px"}}>Search shelf logs</Button>
        <Label for="timestampPost" style={{"marginRight": "10px"}}>From</Label>
        <Input
          type="date"
          style={{"marginRight": "10px"}}
          name="timestampPost"
          placeholder="Timestamp post"
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
          name="timestampAnte"
          placeholder="Timestamp ante"
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
          name="barcode"
          placeholder="Barcode"
          value={props.barcode}
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "barcode": e.target.value
          })}
        />
        <Input
          type="select"
          style={{"marginRight": "10px"}}
          name="user"
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "action": e.target.value
          })}
        >
          <option value="">-- Action --</option>
          { props.actionList.map((action, idx) =>
              <option key={idx} value={action}>{action}</option>
            )
          }
        </Input>
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
              <option key={idx} value={name}>{firstName(name)}</option>
            )
          }
        </Input>
        <Input
          type="text"
          style={{"marginRight": "10px", "width": "300px"}}
          name="details"
          placeholder="Details"
          value={props.details}
          onChange={(e) => props.handleQueryChange(e, {
            ...props.query,
            "details": e.target.value
          })}
        />
      </Row>
    </Form>
  );
};

const ResultDisplay = ({ data }) => (
  <Table responsive striped>
    <TableHead />
    <tbody>
      { data.map((log, idx) =>
          <TableRow
            log={log}
            key={idx}
          />
        )
      }
    </tbody>
  </Table>
)

const TableHead = () => (
  <thead>
    <tr>
      <th>Shelf log ID</th>
      <th>Barcode</th>
      <th>Action</th>
      <th>User</th>
      <th>Details</th>
      <th>Timestamp</th>
    </tr>
  </thead>
)

const TableRow = ({ log, idx }) => (
  <tr key={idx}>
    <td>{log.id}</td>
    <td>{log.barcode}</td>
    <td>{log.action}</td>
    <td>{firstName(log.user)}</td>
    <td>{log.details}</td>
    <td>{log.timestamp}</td>
  </tr>
)

export default ShelfLogs;
