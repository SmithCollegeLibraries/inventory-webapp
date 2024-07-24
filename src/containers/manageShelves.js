import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, Input, Row, Table } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { displayItemList, twoDigits } from '../util/helpers';
import { failure, success, warning } from '../components/toastAlerts';

const processTrayInformation = (trays, size=null) => {
  let trayGrid = {'Front': [], 'Middle': [], 'Rear': []};
  trays.forEach(tray => {
    trayGrid[tray.depth][tray.position - 1] = tray;
  });
  let trayData = {
    // TODO: Get this from settings based on shelf size
    maxPosition: size ? size.maxPosition : 14,
    depths: size ? size.depth : 3,
    trayGrid: trayGrid,
  };
  // Go through each depth, and fill in any missing positions with empty trays
  for (let depth in trayData.trayGrid) {
    for (let i = 0; i < trayData.maxPosition; i++) {
      if (!trayData.trayGrid[depth][i]) {
        trayData.trayGrid[depth][i] = {barcode: '-', position: i + 1, depth: depth};
      }
    }
  }
  return trayData;
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'QUERY_CHANGE':
      return {
        ...state,
        query: {
          ...state.query,
          [action.field]: action.value,
        },
      };
    case 'UPDATE_RESULTS':
      return {
        ...state,
        shelves: action.payload.shelves,
      };
    case 'UPDATE_SELECTION':
      return {
        ...state,
        fields: action.payload,
      };
    case 'UPDATE_COUNT':
      return {
        ...state,
        count: action.payload,
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: action.settings,
      };
    case 'RESET':
      return {
        ...state,
        query: {
          row: '',
          side: '',
          ladder: '',
          rung: '',
        },
        shelves: [],
      }
    default:
      throw new Error();
  }
};

const ManageShelves = () => {
  const initialState = {
    query: {
      row: '',
      side: '',
      ladder: '',
      rung: '',
    },
    shelves: [],
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    dispatch({
      type: 'QUERY_CHANGE',
      field: e.target.name,
      value: e.target.value.replace(/[^0-9LRlr?_-]/g, '').replace(/[\?-]/g,'_').toUpperCase(),
    });
    const index = Array.prototype.indexOf.call(e.target.form, e.target);
    if (e.target.value.length === (e.target.name === "side" ? 1 : 2)) {
      e.target.form.elements[index + 1].focus();
    }
  };

  const handleClearSearch = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET' });
  };

  const handleSearch = async (e) => {
    const shelfQuery = (
      (state.query.row ? twoDigits(state.query.row) : '__') +
      (state.query.side ? state.query.side : '_') +
      (state.query.ladder ? twoDigits(state.query.ladder) : '__') +
      (state.query.rung ? twoDigits(state.query.rung) : '__')
    );

    // Only do search if at most one field is blank
    if ((shelfQuery.match(/_/g)||[]).length > 2) {
      warning("Please search with only one blank field or up to two wildcard characters.");
      return false;
    }

    const results = await ContentSearch.shelves(shelfQuery);
    if (results && results[0]) {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          shelves: results,
        }
      });
    }
    else {
      // If no results were found, and all fields were filled out,
      // the user may be trying to create a new shelf
      if (!shelfQuery.includes('_')) {
        if (window.confirm(`No results found. Would you like to create a new shelf with barcode ${shelfQuery}?`)) {
          handleCreateShelf(e);
        }
        else {
          dispatch({ type: 'UPDATE_RESULTS', payload: { shelves: [] } });
        }
      }
      else {
        dispatch({ type: 'UPDATE_RESULTS', payload: { shelves: [] } });
        warning('No results found.');
      }
    }
  };

  const handleCreateShelf = async (e) => {
    e.preventDefault();
    // If the user supplies shelf, depth or position, double-check
    // with the user if they're not all present
    if (!(state.query.row && state.query.side && state.query.rung && state.query.ladder)) {
      failure("Please provide complete information for the new tray");
      return;
    }
    let shelfBarcode = twoDigits(state.query.row) + state.query.side + twoDigits(state.query.ladder) + twoDigits(state.query.rung);
    // TODO: Validate against shelf structure from settings

    const data = {
      barcode: shelfBarcode,
    };
    const load = await Load.newShelf(data);
    if (load) {
      success(`Shelf ${load['barcode']} successfully added`);
      dispatch({ type: 'RESET', payload: '' });
      handleSearch(false);
    }
    else {
      // There should already be a 400/403 popup from the API
    }
  };

  // Get settings from database on load
  useEffect(() => {
    const getSettings = async () => {
      const settings = await Load.getAllSettings();
      dispatch({ type: 'UPDATE_SETTINGS', settings: settings});
    };
    getSettings();
  }, []);

  // Get the total number of shelves via the API on load
  useEffect(() => {
    async function fetchShelfCount() {
      const totalShelfCount = await Load.shelfCount();
      if (totalShelfCount) {
        dispatch({
          type: 'UPDATE_COUNT',
          payload: totalShelfCount,
        });
      }
    }
    fetchShelfCount();
  }, []);

  return (
    <div>
      <Row style={{"display": "flex", "paddingTop": "20px", "paddingLeft": "15px", "paddingRight": "20px"}}>
        <SearchForm
          query={state.query}
          handleSearch={handleSearch}
          handleQueryChange={handleQueryChange}
          handleClearSearch={handleClearSearch}
          handleCreateShelf={handleCreateShelf}
        />
        { state.count &&
          <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count} shelves`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count} shelves total`}</Button>
        }
      </Row>
      <div style={{marginTop: "10px", fontStyle: "italic"}}>You can use _ as a wildcard character, or leave one search field blank.</div>
      <div style={{marginTop: "20px"}}>
        { state.shelves
          ? Object.keys(state.shelves).map((shelf, idx) => {
              return (
                <ResultDisplay
                  data={state.shelves[shelf]}
                  index={idx}
                  key={idx}
                />
              );
            })
          : null
        }
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form inline style={{"float": "left"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px", "width": "6em"}}
        name="row"
        placeholder="Row"
        value={props.query.row}
        maxLength={2}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Input
        type="text"
        style={{"marginRight": "10px", "width": "4em"}}
        name="side"
        placeholder="Side"
        value={props.query.side}
        maxLength={1}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Input
        type="text"
        style={{"marginRight": "10px", "width": "6em"}}
        name="ladder"
        placeholder="Ladder"
        value={props.query.ladder}
        maxLength={2}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Input
        type="text"
        style={{"marginRight": "10px", "width": "6em"}}
        name="rung"
        placeholder="Rung"
        value={props.query.rung}
        maxLength={2}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary" type="submit" style={{"marginRight": "10px"}}>Search</Button>
      <Button color="warning" style={{"marginRight": "10px"}} onClick={(e) => props.handleClearSearch(e)}>Clear</Button>
    </Form>
  );
};

// TODO: Redo this entire form for shelves (existing code is for trays)
// TODO: Add functionality for modal popup showing items in tray
// onClick={(e) => props.handleTraySelect(props.data, e)}
const ResultDisplay = (props) => {
  return (
    <Card>
      <CardBody>
        <div style={{marginBottom: "2ex"}}>
          <span style={{fontWeight: "bold", paddingRight: "1ex"}}>Barcode</span>
          {props.data.barcode}
          <span style={{marginLeft: "2ex", marginRight: "2ex"}}>•</span>
          {/* TODO: Put size here */}
          <span style={{fontWeight: "bold", marginRight: "1ex"}}>Trays</span>
          {props.data.trays.length}
        </div>
        <Table style={{tableLayout: "fixed"}}>
          <tbody>
            { Object.keys(processTrayInformation(props.data.trays).trayGrid).map(
              (depth, idx) => {
                return (
                  <tr key={idx}>
                    { processTrayInformation(props.data.trays).trayGrid[depth].map((tray, idx) => {
                      return (
                        <td
                            idx={idx}
                            key={idx}
                            title={`${props.data.barcode} • ${tray.depth} • ${tray.position}`}
                            className={tray.flag ? "text-danger" : ""}
                            style={{
                              cursor: "pointer",
                              textAlign: "center",
                              backgroundColor: tray.barcode === "-" ? "lightgray" : "white"}}
                          >
                          {tray.barcode}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </CardBody>
    </Card>
  );
};

export default ManageShelves;
