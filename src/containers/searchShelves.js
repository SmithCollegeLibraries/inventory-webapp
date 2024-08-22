import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, Input, Modal, ModalHeader, ModalBody, ModalFooter, Row, Table, Label } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { displayItemList, padShelfBarcode } from '../util/helpers';
import { warning } from '../components/toastAlerts';

const processTrayInformation = (trays, size=null) => {
  let trayGrid = {'Rear': [], 'Middle': [], 'Front': [], 'Other': []};
  trays.forEach(tray => {
    if (tray.depth && tray.position) {
      trayGrid[tray.depth][tray.position - 1] = tray;
    }
    else {
      trayGrid['Other'].push(tray);
    }
  });
  let trayData = {
    // TODO: Get this from settings based on shelf size
    maxPosition: size ? size.maxPosition : 14,
    depths: size ? size.depth : 3,
    trayGrid: trayGrid,
  };
  // Go through each depth, and fill in any missing positions with empty trays
  for (let depth of ["Front", "Middle", "Rear", "Other"]) {
    // Depths other than Front and Rear shouldn't display if they're empty
    if (depth === 'Front' || depth === 'Rear' || trayData.trayGrid[depth].length > 0) {
      for (let i = 0; i < trayData.maxPosition; i++) {
        if (!trayData.trayGrid[depth][i]) {
          trayData.trayGrid[depth][i] = {barcode: '-', position: i + 1, depth: depth};
        }
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
        currentTray: action.tray,
        currentShelf: action.shelf,
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
          shelf: '',
          tray: '',
        },
        shelves: [],
        currentTray: null,
        currentShelf: null,
      }
    default:
      throw new Error();
  }
};

const SearchShelves = () => {
  const initialState = {
    query: {
      shelf: '',
      tray: '',
    },
    shelves: [],
    currentTray: null,
    currentShelf: null,
    settings: {},
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    dispatch({
      type: 'QUERY_CHANGE',
      field: e.target.name,
      value: e.target.value.replace(/[^0-9A-Za-z?_-]/g, '').replace(/[?_]/g,'-').toUpperCase(),
    });
    // const index = Array.prototype.indexOf.call(e.target.form, e.target);
    // if (e.target.value.length === (e.target.name === "side" ? 1 : 2)) {
    //   e.target.form.elements[index + 1].focus();
    // }
  };

  const handleClearSearch = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET' });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_RESULTS', payload: { shelves: [] } });

    const shelfQuery = (padShelfBarcode(state.query.shelf));
    const trayQuery = (state.query.tray);

    const results = await ContentSearch.shelves(shelfQuery, trayQuery);
    if (results && results[0]) {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          shelves: results,
        }
      });
    }
    else {
      dispatch({ type: 'UPDATE_RESULTS', payload: { shelves: [] } });
      warning('No results found.');
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
        />
        { state.count &&
          <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count} shelves`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count} shelves total`}</Button>
        }
      </Row>
      <div style={{marginTop: "10px", fontStyle: "italic"}}>You can use <code>-</code> as a wildcard character for shelf barcodes. Up to 60 results will be shown.</div>
      <div style={{marginTop: "20px"}}>
        { state.shelves
          ? Object.keys(state.shelves).map((shelf, idx) => {
              return (
                <ResultDisplay
                  data={state.shelves[shelf]}
                  thisShelf={shelf}
                  currentTray={state.currentTray}
                  currentShelf={state.currentShelf}
                  index={idx}
                  key={idx}
                  handleTraySelect={
                    (tray) => {
                      if (!tray || tray.barcode === '-')
                        dispatch({ type: 'UPDATE_SELECTION', tray: null, shelf: null });
                      else {
                        dispatch({ type: 'UPDATE_SELECTION', tray: tray, shelf: shelf });
                      }
                    }
                  }
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
      <Label for="shelf" style={{marginRight:'10px'}}>
        Shelf
      </Label>
      <Input
        type="text"
        name="shelf"
        placeholder="09R--1-"
        value={props.query.shelf}
        maxLength={7}
        style={{marginRight:'20px'}}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Label for="tray" style={{marginRight:'10px'}}>
        Tray
      </Label>
      <Input
        type="text"
        name="tray"
        placeholder="10001234"
        value={props.query.tray}
        style={{marginRight:'20px'}}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary" type="submit" style={{"marginRight": "10px"}}>Search</Button>
      <Button color="warning" style={{"marginRight": "10px"}} onClick={(e) => props.handleClearSearch(e)}>Clear</Button>
    </Form>
  );
};

const ResultDisplay = (props) => {
  return (
    <>
      <Modal isOpen={!!props.currentTray && props.currentShelf === props.thisShelf} toggle={() => props.handleTraySelect(null)}>
        <ModalHeader>Tray details</ModalHeader>
        <ModalBody>
          {props.currentTray ?
            <dl>
              <dt>Barcode</dt>
              <dd>{props.currentTray.barcode}</dd>
              { props.currentTray.flag ? <><dt className="text-danger">Flagged</dt><dd></dd></> : null}
              <dt>Location</dt>
              <dd>{`${props.data.barcode} • ${props.currentTray.depth} • ${props.currentTray.position}`}</dd>
              <dt>Trayer</dt>
              <dd>{props.currentTray.trayer ?? '-'}</dd>
              <dt>Items ({props?.currentTray?.items?.length})</dt>
              <dd>
                {props.currentTray.items && props.currentTray.items.length > 0 ? displayItemList(props.currentTray.items) : '-'}
              </dd>
            </dl>
          : null}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => props.handleTraySelect(null)}>Close</Button>
        </ModalFooter>
      </Modal>
      <Card>
        <CardBody>
          <div style={{marginBottom: "2ex"}}>
            <dl>
              <dt style={{display: "inline", marginRight: "1ex"}}>Barcode</dt>
              <dd style={{display: "inline", marginRight: "3ex"}}>{props.data.barcode}</dd>
              {/* TODO: Put size here */}
              <dt style={{display: "inline", marginRight: "1ex"}}>Trays</dt>
              <dd style={{display: "inline", marginRight: "3ex"}}>{props.data.trays.length}</dd>
            </dl>
          </div>
          <Table style={{tableLayout: "fixed"}}>
            <tbody>
              { Object.keys(processTrayInformation(props.data.trays).trayGrid).map(
                (depth, idx) => {
                  return (
                    <tr key={idx}>
                      { processTrayInformation(props.data.trays).trayGrid[depth].length > 0 ? <th>{depth}</th> : null }
                      { processTrayInformation(props.data.trays).trayGrid[depth].map((tray, idx) => {
                        return (
                          <td
                              idx={idx}
                              key={idx}
                              title={`${props.data.barcode} • ${tray.depth} • ${tray.position}`}
                              className={tray.flag ? "text-danger" : ""}
                              style={{
                                cursor: tray.barcode === "-" ? "default" : "pointer",
                                textAlign: "center",
                                backgroundColor: tray.barcode === "-" ? "lightgray" : "white",
                                color: tray.barcode === "-" ? "gray" : "black",
                                whiteSpace: "nowrap",
                              }}
                              onClick={(e) => props.handleTraySelect(tray, e)}
                            >
                            {tray.barcode === '-' ? '-' :
                              <>
                                {tray.barcode.replace(/\D/g,'')}<br />
                                {`${tray.items.length} ${tray.items.length === 1 ? 'item' : 'items'}`}
                              </>
                            }
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
    </>
  );
};

export default SearchShelves;
