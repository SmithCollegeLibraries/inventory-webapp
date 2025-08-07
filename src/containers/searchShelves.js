import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Input, Modal, ModalHeader, ModalBody, ModalFooter, Table, Label } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { displayItemList, padShelfBarcode } from '../util/helpers';
import { success, warning } from '../components/toastAlerts';

const ANY_SIZE = '(Any)';
const ANY_COLLECTION = '(Any)';
const ANY_SHELF_FULNESS = '(Any)';
const TOO_MANY_POSITIONS = 14;


const processTrayInformation = (data) => {
  let trayGrid = {'Rear': [], 'Middle': [], 'Front': [], 'Other': []};
  data.trays.forEach(tray => {
    if (tray.depth && tray.position) {
      trayGrid[tray.depth][tray.position - 1] = tray;
    }
    else {
      trayGrid['Other'].push(tray);
    }
  });
  let trayData = {
    maxPosition: data.positions,
    depths: data.depths,
    trayGrid: trayGrid,
  };
  // Go through each depth, and fill in any missing positions with empty trays
  for (let depth of ["Front", "Middle", "Rear", "Other"]) {
    // Depths shouldn't display if they're empty (except
    if ((data.depths >= 2 && (depth === 'Front' || depth === 'Rear'))
        || (data.depths === 3 && depth === 'Middle')
        || trayData.trayGrid[depth].length > 0
    ) {
      for (let i = 0; i < trayData.maxPosition; i++) {
        if (!trayData.trayGrid[depth][i]) {
          trayData.trayGrid[depth][i] = {barcode: "-", position: i + 1, depth: depth};
        }
      }
    }
  }
  // Truncate barcodes for a shelf/depth that has > 14 positions,
  // Always replace barcode with just numeric portion
  let truncateBarcodes = Object.values(trayData.trayGrid).some(depth => depth.length > TOO_MANY_POSITIONS);

  for (let depth of ["Front", "Middle", "Rear", "Other"]) {
    for (let i = 0; i < trayData.trayGrid[depth].length; i++) {
      if (trayData.trayGrid[depth][i]) {
        if (truncateBarcodes) {
          trayData.trayGrid[depth][i].shortBarcode = '…' + trayData.trayGrid[depth][i].barcode.replace(/\D/g,'').slice(-4);
        } else {
          trayData.trayGrid[depth][i].shortBarcode = trayData.trayGrid[depth][i].barcode.replace(/\D/g,'');
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
    case 'UPDATE_COLLECTIONS':
      return {
        ...state,
        collections: action.collections,
      };
    case 'UPDATE_SIZES':
      return {
        ...state,
        sizes: action.sizes,
      };
    case 'RESET':
      return {
        ...state,
        query: {
          size: "",
          collection: "",
          positions_free: "",
          shelf: "",
          tray: "",
        },
        shelves: [],
        currentTray: null,
        currentShelf: null,
      }
    case 'CLEAR_EXCEPT_TRAY':
      return {
        ...state,
        query: {
          size: "",
          collection: "",
          positions_free: "",
          shelf: "",
          tray: state.query.tray,
        },
      }
    default:
      throw new Error();
  }
};

const SearchShelves = () => {
  const initialState = {
    query: {
      size: "",
      collection: "",
      positions_free: "",
      shelf: "",
      tray: "",
    },
    shelves: [],
    currentTray: null,
    currentShelf: null,
    settings: {},
    collections: [],
    sizes: [],
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    dispatch({
      type: "QUERY_CHANGE",
      field: e.target.name,
      value: (e.target.name === 'shelf' || e.target.name === 'tray')
              ? e.target.value.replace(/[^0-9A-Za-z?_-]/g, '').replace(/[?_]/g,'-').toUpperCase()
              : e.target.value,
    });
    // const index = Array.prototype.indexOf.call(e.target.form, e.target);
    // if (e.target.value.length === (e.target.name === "side" ? 1 : 2)) {
    //   e.target.form.elements[index + 1].focus();
    // }
  };

  const handleClearSearch = (e) => {
    e.preventDefault();
    dispatch({ type: "RESET" });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    dispatch({ type: "UPDATE_RESULTS", payload: { shelves: [] } });

    if (state.query.tray) {
      dispatch({ type: "CLEAR_EXCEPT_TRAY" });
    }

    const response = await ContentSearch.shelves(
        padShelfBarcode(state.query.shelf),
        state.query.tray,
        state.query.size,
        state.query.collection,
        null,
        null,
        state.query.positions_free,
        false,
      );
    if (response.resultCount > 0) {
      dispatch({
        type: "UPDATE_RESULTS",
        payload: {
          shelves: response.results,
        }
      });
      if (response.resultCount > response.results.length) {
        success(<>{response.resultCount} shelves found<br />(showing first {response.results.length})</>);
      }
      else if (!state.query.tray) {
        success("Tray found");
      }
    }
    else {
      dispatch({ type: "UPDATE_RESULTS", payload: { shelves: [] } });
      if (state.query.tray) {
        warning(`Tray ${state.query.tray} not found`);
      }
      else {
        warning('No results found');
      }
    }
  };

  // Get settings from database on load
  useEffect(() => {
    const getSettings = async () => {
      const settings = await Load.getAllSettings();
      dispatch({ type: "UPDATE_SETTINGS", settings: settings});
    };
    getSettings();
  }, []);

  // Get list of active collections from database on load
  useEffect(() => {
    const getCollections = async () => {
      const collections = await Load.getAllCollections();
      dispatch({ type: 'UPDATE_COLLECTIONS', collections: collections});
    };
    getCollections();
  }, []);

  // Get list of sizes from database on load
  useEffect(() => {
    const getSizes = async () => {
      const sizes = await Load.getAllSizes();
      dispatch({ type: 'UPDATE_SIZES', sizes: sizes});
    };
    getSizes();
  }, []);

  // Get the total number of shelves via the API on load
  useEffect(() => {
    async function fetchShelfCount() {
      const totalShelfCount = await Load.shelfCount();
      if (totalShelfCount) {
        dispatch({
          type: "UPDATE_COUNT",
          payload: totalShelfCount,
        });
      }
    }
    fetchShelfCount();
  }, []);

  return (
    <div>
      <SearchForm
        query={state.query}
        collections={state.collections}
        sizes={state.sizes}
        handleSearch={handleSearch}
        handleQueryChange={handleQueryChange}
        handleClearSearch={handleClearSearch}
      />
      <div style={{marginTop: "10px", fontStyle: "italic"}}>You can use <code>-</code> as a wildcard character for shelf barcodes. Up to 60 shelves will be shown at one time.</div>
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
                        dispatch({ type: "UPDATE_SELECTION", tray: null, shelf: null });
                      else {
                        dispatch({ type: "UPDATE_SELECTION", tray: tray, shelf: shelf });
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
    <Form autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <FormGroup style={{display: "flex", alignItems: "baseline", paddingTop: "20px"}}>
        <Label for="size" style={{marginRight: "10px", marginBottom: "0px"}}>
          Size
        </Label>
        <Input
          type="select"
          name="size"
          value={props.query.size || ""}
          style={{width: "8em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        >
          <option value="">{ANY_SIZE}</option>
          { props.sizes
            ? Object.keys(props.sizes).map((objects, idx) => (
                <option value={props.sizes[objects].code} key={idx}>{props.sizes[objects].code}</option>
              ))
            : null
          }
        </Input>
        <Label for="collection" style={{marginRight: "10px"}}>
          Collection
        </Label>
        <Input
          type="select"
          name="collection"
          value={props.query.collection || ""}
          style={{width: "20em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        >
          <option value="">{ANY_COLLECTION}</option>
          { props.collections
            ? Object.keys(props.collections).map((objects, idx) => (
                <option value={props.collections[objects].name} key={idx}>{props.collections[objects].name}</option>
              ))
            : null
          }
        </Input>
        <Label for="positions_free" style={{marginRight: "10px"}}>
          Free space
        </Label>
        <Input
          type="select"
          name="positions_free"
          value={props.query.positions_free || ""}
          style={{width: "12em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        >
          <option value="">{ANY_SHELF_FULNESS}</option>
          <option value="0">Shelf full</option>
          <option value="-1">Shelf empty</option>
          { Array.from({length: 15}, (_, i) => (
              <option value={i+1} key={i+1}>Room for {i+1}+ trays</option>
            ))
          }
        </Input>
      </FormGroup>
      <FormGroup style={{display: "flex", alignItems: "baseline"}}>
        <Label for="shelf" style={{marginRight: "10px", marginBottom: "0px"}}>
          Shelf
        </Label>
        <Input
          type="text"
          name="shelf"
          placeholder="09R--1-"
          value={props.query.shelf}
          maxLength={7}
          style={{width: "8em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        />
        <Label for="tray" style={{marginRight: "10px"}}>
          Tray
        </Label>
        <Input
          type="text"
          name="tray"
          placeholder="10001234"
          value={props.query.tray}
          style={{width: "10em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        />
        <Button color="primary" type="submit" style={{"marginRight": "10px"}}>Search</Button>
        <Button color="warning" style={{"marginRight": "10px"}} onClick={(e) => props.handleClearSearch(e)}>Clear</Button>
      </FormGroup>
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
              <dt>Size</dt>
              <dd className={(props.currentTray?.size?.code != props.data.size) ? "text-danger" : ""}>
                {props.currentTray?.size?.code ?? '-'}
              </dd>
              { props.currentTray.flag ? <><dt className="text-danger">Flagged</dt><dd></dd></> : null}
              <dt>Location</dt>
              <dd>{`${props.data.barcode} • ${props.currentTray.depth} • ${props.currentTray.position}`}</dd>
              <dt>Trayer</dt>
              <dd>{props.currentTray.trayer ?? '-'}</dd>
              <dt>Items { props?.currentTray?.items?.length ? `(${props?.currentTray?.items?.length}/${props?.currentTray?.freeSpace !== null ? props?.currentTray.items.length + props.currentTray.freeSpace : "?" })` : "" }</dt>
              <dd>
                {props.currentTray.items && props.currentTray.items.length > 0 ? displayItemList(props.currentTray.items) : "-"}
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
              <dd className={props.data.flag ? "text-danger" : ""} style={{display: "inline", marginRight: "3ex"}}>{props.data.barcode}</dd>
              <dt style={{display: "inline", marginRight: "1ex"}}>Size</dt>
              <dd style={{display: "inline", marginRight: "3ex"}}>{props.data.size ?? '-'}</dd>
              <dt style={{display: "inline", marginRight: "1ex"}}>Collection</dt>
              <dd style={{display: "inline", marginRight: "3ex"}}>{props.data.collection ?? '-'}</dd>
              <dt style={{display: "inline", marginRight: "1ex"}}>Trays</dt>
              <dd style={{display: "inline", marginRight: "3ex"}}>{props.data.trays.length}</dd>
            </dl>
          </div>
          <Table style={{tableLayout: "fixed", marginBottom: "0"}}>
            <tbody>
              { Object.keys(processTrayInformation(props.data).trayGrid).map(
                (depth, idx) => {
                  return (
                    <tr key={idx}>
                      { processTrayInformation(props.data).trayGrid[depth].length > 0
                        ? <th style={{width: "6em", borderBottom: "1px solid #dee2e6", borderRight: "1px solid #dee2e6"}}>{depth}</th>
                        : null
                      }
                      { processTrayInformation(props.data).trayGrid[depth].map((tray, idx) => {
                        return (
                          <td
                              idx={idx}
                              key={idx}
                              title={`${props.data.barcode} • ${tray.depth} • ${tray.position}`}
                              className={tray.flag ? "text-danger" : (tray.freeSpace === null || tray.freeSpace > 0 ? "text-info" : null)}
                              style={{
                                cursor: tray.barcode === "-" ? "default" : "pointer",
                                textAlign: "center",
                                backgroundColor: tray.barcode === "-" ? "lightgray" : "white",
                                color: tray.barcode === "-" ? "gray" : "black",
                                whiteSpace: "nowrap",
                                paddingLeft: 0,
                                paddingRight: 0,
                                border: "1px solid #dee2e6",
                              }}
                              onClick={(e) => props.handleTraySelect(tray, e)}
                            >
                            { tray.barcode === '-' ? '-' :
                              <>
                                {tray.shortBarcode}<br />
                                {`${tray.items.length} ${tray.items.length === 1 ? 'item' : "items"}`}
                              </>
                            }<br />
                            { tray.freeSpace === null ? '? free' : (tray.freeSpace > 0 ? `~${tray.freeSpace} free` : "") }
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
