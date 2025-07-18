import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { padShelfBarcode } from '../util/helpers';
import { success, warning } from '../components/toastAlerts';

const UNKNOWN = 'Unknown';

const reducer = (state, action) => {
  switch (action.type) {
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
    case 'QUERY_CHANGE':
      return {
        ...state,
        [action.payload.field]: action.payload.value,
      };
    case 'FLAGGED_ONLY':
      return {
        ...state,
        flaggedOnly: action.payload
      };
    case 'UPDATE_RESULTS':
      return {
        ...state,
        search_results: action.payload.search_results,
      };
    case 'UPDATE_SELECTION':
      return {
        ...state,
        fields: action.payload,
      };
    case 'UPDATE_FIELD':
      const data = state.fields;
      data[action.payload.field] = action.payload.value;
      return {
        ...state,
        fields: data,
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
    case 'RESET_RESULTS':
      return {
        ...state,
        search_results: [],
      };
    case 'RESET':
      return {
        ...state,
        fields: {
          new_shelf: false,
          shelf_barcode: '',
          new_shelf_barcode: '',
          row: '',
          side: '',
          ladder: '',
          rung: '',
          width: null,
          height: null,
          depths: null,
          positions: null,
          size: null,
          collection: null,
          notes: '',
          flag: false,
          trays: [],
        },
      }
    default:
      throw new Error();
  }
};

const ManageShelves = () => {
  const initialState = {
    barcode: '',
    sizeQuery: null,
    collectionQuery: null,
    positionsFree: '',
    flaggedOnly: false,
    search_results: [],
    fields: {
      new_shelf: false,
      shelf_barcode: '',
      new_shelf_barcode: '',
      row: '',
      side: '',
      ladder: '',
      rung: '',
      width: null,
      height: null,
      depths: null,
      positions: null,
      size: null,
      collection: null,
      notes: '',
      flag: false,
      trays: [],
    },
    collections: [],
    sizes: [],
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    dispatch({
      type: "QUERY_CHANGE",
      payload: {
        field: e.target.name,
        value: e.target.value,
      },
    });
  };

  const handleFlaggedOnlyChange = () => {
    dispatch({
      type: "FLAGGED_ONLY",
      payload: !state.flaggedOnly,
    });
  };

  const handleShelfChange = e => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        field: e.target.name,
        value: e.target.value === "true" ? true : e.target.value === "false" ? false : e.target.value,
      }
    });
  };

  const handleShelfSelect = (data, e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_shelf: false,
        shelf_barcode: data.barcode,
        new_shelf_barcode: '',
        row: data.row,
        side: data.side,
        ladder: data.ladder,
        rung: data.rung,
        width: data.width,
        height: data.height,
        depths: data.depths,
        positions: data.positions,
        size: data.size,
        collection: data.collection,
        notes: data.notes,
        flag: !!data.flag,
        trays: data.trays,
      }
    });
  }

  const handleNewShelfSelect = (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_shelf: true,
        shelf_barcode: '',
        new_shelf_barcode: '',
        row: '',
        side: '',
        ladder: '',
        rung: '',
        width: null,
        height: null,
        depths: null,
        positions: null,
        size: null,
        collection: null,
        notes: '',
        flag: false,
        trays: [],
      }
    });
  }

  const handleSearch = async (showWarnings = false) => {
    dispatch({ type: 'RESET_RESULTS', payload: '' });
    const results = await ContentSearch.shelves(
      padShelfBarcode(state.barcode),
      null,  // not searching by tray
      state.sizeQuery,
      state.collectionQuery,
      state.positionsFree,
      state.flaggedOnly,
    );
    if (results && results[0]) {
      let trays = [];
      for (let barcode of results[0].trays) {
        trays.push(barcode);
      }
      const fields = {
        new_shelf: false,
        shelf_barcode: results[0].barcode ?? "",
        new_shelf_barcode: '',
        row: results[0].row ?? "",
        side: results[0].side ?? "",
        ladder: results[0].ladder ?? "",
        rung: results[0].rung ?? "",
        width: results[0].width ?? null,
        height: results[0].height ?? null,
        depths: results[0].depths ?? null,
        positions: results[0].positions ?? null,
        size: results[0].size ?? null,
        collection: results[0].collection ?? null,
        notes: '',
        flag: !!results[0].flag,
        trays: trays,
      }
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: results,
          fields: fields,
        }
      });
    }
    else {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: [],
          fields: {
            shelf_barcode: '',
            new_shelf_barcode: '',
            row: '',
            side: '',
            ladder: '',
            rung: '',
            width: null,
            height: null,
            depths: null,
            positions: null,
            size: null,
            collection: null,
            notes: '',
            flag: false,
            trays: [],
          },
        }
      })
      if (showWarnings) {
        warning('No results found');
      }
    }
  };

  const handleShelfUpdate = async (e) => {
    e.preventDefault();
    // Pass an empty string or 0 in order to clear the value on the API call.
    // Since this is for updating a shelf via the API, we do want to clear
    // any fields that don't have data.
    const data = {
      barcode: state.fields.shelf_barcode,
      new_barcode: state.fields.new_shelf_barcode || null,
      row: state.fields.row || "",
      side: state.fields.side || "",
      ladder: state.fields.ladder || "",
      rung: state.fields.rung || "",
      width: state.fields.width || "",
      height: state.fields.height || "",
      depths: state.fields.depths || "",
      positions: state.fields.positions || "",
      size: state.fields.size || "",
      collection: state.fields.collection || "",
      notes: state.fields.notes || "",
      flag: state.fields.flag,
    };
    console.log(data);
    const load = await Load.updateShelf(data);
    if (load) {
      success(`Shelf ${load['barcode']} successfully updated`);
      dispatch({ type: 'RESET', payload: ''});
      handleSearch(false);
    }
    else {
      // There should already be a 400/403 popup from the API
    }
  };

  const handleCreateShelf = async (e) => {
    e.preventDefault();

    const data = {
      barcode: state.fields.shelf_barcode,
      row: state.fields.row || null,
      side: state.fields.side || null,
      ladder: state.fields.ladder || null,
      rung: state.fields.rung || null,
      width: state.fields.width || null,
      height: state.fields.height || null,
      depths: state.fields.depths || null,
      positions: state.fields.positions || null,
      size: state.fields.size || null,
      collection: state.fields.collection || null,
      notes: state.fields.notes || "",
      flag: state.fields.flag,
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

  const handleShelfDelete = async (barcode, e) => {
    e.preventDefault();
    const data = {
      barcode: barcode,
    };
    const load = await Load.deleteShelf(data);
    if (load) {
      success(`Shelf ${load['barcode']} successfully deleted`);
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
          type: 'UPDATE_COUNT',
          payload: totalShelfCount,
        });
      }
    }
    fetchShelfCount();
  }, []);

  return (
    <div>
      <Row
        style={{
          display: "flex",
          alignItems: "center",
          paddingTop: "20px",
          paddingLeft: "15px",
          paddingRight: "20px"
        }}
      >
        <SearchForm
          barcode={state.barcode}
          sizeQuery={state.sizeQuery}
          collectionQuery={state.collectionQuery}
          positionsFree={state.positionsFree}
          flaggedOnly={state.flaggedOnly}
          handleSearch={handleSearch}
          handleQueryChange={handleQueryChange}
        />
        <Button
          color="warning"
          style={{ marginRight: "20px" }}
          onClick={(e) => handleNewShelfSelect(e)}
        >
          New shelf
        </Button>
        <FormGroup check style={{ textAlign: "right", display: "flex", alignItems: "center", marginRight: "20px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Input
              id="flaggedOnlyCheckbox"
              type="checkbox"
              checked={state.flaggedOnly}
              onChange={handleFlaggedOnlyChange}
              style={{ marginTop: "0", marginBottom: "0", marginRight: "4px", verticalAlign: "middle", cursor: "pointer" }}
            />
            <Label
              for="flaggedOnlyCheckbox"
              check
              style={{
                marginBottom: "0",
                marginTop: "0",
                display: "flex",
                alignItems: "center",
                verticalAlign: "middle",
                cursor: "pointer",
                fontWeight: 400
              }}
            >
              Flagged only
            </Label>
          </div>
        </FormGroup>
        { state.count &&
          <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count.toLocaleString()} shelves`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count.toLocaleString()} shelves total`}</Button>
        }
      </Row>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            { state.search_results
              ? Object.keys(state.search_results).map((shelf, idx) => {
                  return (
                    !state.flaggedOnly || state.search_results[shelf].flag ?
                    ( !state.search_results[shelf].shelf ?
                      <ResultDisplay
                        data={state.search_results[shelf]}
                        handleShelfSelect={handleShelfSelect}
                        index={idx}
                        key={idx}
                      />
                      : null
                    ) : null
                  );
                })
              : null
            }
          </Col>
          <Col md="4">
            { state.fields && ((state.fields.shelf_barcode && state.fields.shelf_barcode !== "") || state.fields.new_shelf)
              ? <Card>
                  <CardBody>
                    <ShelfForm
                      fields={state.fields}
                      handleShelfChange={handleShelfChange}
                      handleShelfUpdate={handleShelfUpdate}
                      handleShelfDelete={handleShelfDelete}
                      handleCreateShelf={handleCreateShelf}
                      settings={state.settings}
                      collections={state.collections}
                      sizes={state.sizes}
                    />
                  </CardBody>
                </Card>
              : null
            }
          </Col>
          <Col md="4">
            { state.fields && state.fields.shelf_barcode && state.fields.shelf_barcode !== ""
              ? <Card>
                {/* TODO: put list of trays here; other info? see displayItemList in manageTrays */}
                </Card>
              : null
            }
          </Col>
        </Row>
      </div>
    </div>
  );
};

// TODO: Search form should have working "Positions free", and also
// allow for searching by collection and size.

const SearchForm = props => {
  return (
    <Form inline style={{"float": "left"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="barcode"
        placeholder="Shelf barcode"
        value={props.barcode}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Input
        type="number"
        style={{"marginRight": "10px", "width": "9em"}}
        name="positions_free"
        placeholder="Positions free"
        value={props.positionsFree}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary" style={{"marginRight": "10px"}}>Search</Button>
    </Form>
  );
};

const ResultDisplay = (props) => {
  return (
    <Card
      style={{"paddingLeft": "10px", "cursor": "pointer"}}
      onClick={(e) => props.handleShelfSelect(props.data, e)}
    >
      <CardBody>
        <Row>
          <dl className="row">
            <dt className="col-sm-3">Barcode</dt>
              <dd className={`col-sm-9${props.data.flag ? " text-danger" : ""}`}>
                {props.data.barcode}
              </dd>
              <dt className="col-sm-3">Collection</dt>
              <dd className="col-sm-9">
                {props.data.collection ?? '-'}
              </dd>
              <dt className="col-sm-3">Size</dt>
              <dd className="col-sm-9">
                {props.data?.size ?? '-'}
              </dd>
              <dt className="col-sm-3">Trays</dt>
              <dd className={ `col-sm-9 ${props.data.capacity === null || props.data.trays.length < props.data.capacity ? 'text-info' : ( props.data.trays.length > props.data.capacity ? 'text-danger' : '')}` }>
                {props.data.trays.length} ({props.data.capacity !== null
                  ? (
                    props.data.trays.length >= props.data.capacity
                      ? (props.data.trays.length === props.data.capacity ? 'full' : 'overfull')
                      : `${props.data.capacity - props.data.trays.length} ${props.data.capacity - props.data.trays.length === 1 ? "space" : "spaces" } free`
                    )
                  : 'may have free space'})
              </dd>
              <dt className="col-sm-3">Width</dt>
              <dd className="col-sm-9">
                {props.data?.width ? props.data?.width + '″' : '-'}
              </dd>
              <dt className="col-sm-3">Height</dt>
              <dd className="col-sm-9">
                {props.data?.height ? props.data?.height + '″' : '-'}
              </dd>
              <dt className="col-sm-3">Depths</dt>
              <dd className="col-sm-9">
                {props.data?.depths ?? '-'}
              </dd>
              <dt className="col-sm-3">Positions</dt>
              <dd className="col-sm-9">
                {props.data?.positions ?? '-'}
              </dd>
          </dl>
        </Row>
      </CardBody>
    </Card>
  );
}

const ShelfForm = (props) => {
  return (
    <Row>
      <Col>
        <Form autoComplete="off">
          { !props.fields.new_shelf &&
            <FormGroup>
              <Label for="shelf_barcode" style={{"fontWeight":"bold"}}>Shelf barcode</Label>
              <Input type="text" disabled value={props.fields.shelf_barcode} name="shelf_barcode" />
            </FormGroup>
          }
          <FormGroup>
            <Label for="new_shelf_barcode" style={{"fontWeight":"bold"}}>New shelf barcode</Label>
            <Input type="text" value={props.fields.new_shelf_barcode || ''} onChange={(e) => props.handleShelfChange(e)} name="new_shelf_barcode" />
          </FormGroup>
          <Row>
            <Col md="8">
              <FormGroup>
                <Label for="collection" style={{"fontWeight":"bold"}}>Collection</Label>
                <Input type="select" value={props.fields.collection} onChange={(e) => props.handleShelfChange(e)} name="collection">
                  <option value={UNKNOWN}>{ UNKNOWN }</option>
                  { props.collections
                    ? Object.keys(props.collections).map((items, idx) => (
                        <option value={props.collections[items].name} key={idx}>{props.collections[items].name}</option>
                      ))
                    : <option></option>
                  }
                </Input>
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label for="size" style={{"fontWeight":"bold"}}>Size</Label>
                <Input type="select" value={props.fields.size} onChange={(e) => props.handleShelfChange(e)} name="size">
                  <option value={UNKNOWN}>{ UNKNOWN }</option>
                  { props.sizes
                    ? Object.keys(props.sizes).map((items, idx) => (
                        <option value={props.sizes[items].name} key={idx}>{props.sizes[items].code}</option>
                      ))
                    : <option></option>
                  }
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md="3">
              <FormGroup>
                <Label for="row" style={{"fontWeight":"bold"}}>Row</Label>
                <Input type="text" value={props.fields.row || ''} onChange={(e) => props.handleShelfChange(e)} name="row" />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label for="side" style={{"fontWeight":"bold"}}>Side</Label>
                <Input type="select" value={props.fields.side || ''} onChange={(e) => props.handleShelfChange(e)} name="side">
                  <option value="R">R</option>
                  <option value="L">L</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label for="ladder" style={{"fontWeight":"bold"}}>Ladder</Label>
                <Input type="number" name="ladder" value={props.fields.ladder || ''} min={0} max={props.settings.maxLadder} onChange={e => props.handleShelfChange(e)} />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label for="rung" style={{"fontWeight":"bold"}}>Rung</Label>
                <Input type="number" name="rung" value={props.fields.rung || ''} min={0} max={props.settings.maxRung} onChange={e => props.handleShelfChange(e)} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md="4">
              <FormGroup>
                <Label for="depths" style={{"fontWeight":"bold"}}>Depths</Label>
                <Input type="number" value={props.fields.depths || ''} min={0} max={props.settings.maxDepths} onChange={(e) => props.handleShelfChange(e)} name="depths" />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label for="positions" style={{"fontWeight":"bold"}}>Positions</Label>
                <Input type="number" value={props.fields.positions || ''} min={0} max={props.settings.maxPosition} onChange={(e) => props.handleShelfChange(e)} name="positions" />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label for="capacity" style={{"fontWeight":"bold"}}>Capacity</Label>
                <Input type="text" disabled value={props.fields.depths && props.fields.positions && props.fields.depths * props.fields.positions > 0 ? props.fields.depths * props.fields.positions : ''} onChange={(e) => props.handleShelfChange(e)} name="capacity" />
              </FormGroup>
            </Col>
            </Row>
          <Row>
            <Col md="3">
              <FormGroup>
                <Label for="height" style={{"fontWeight":"bold"}}>Height</Label>
                <Input type="number" value={props.fields.height || ''} min={0} onChange={(e) => props.handleShelfChange(e)} name="height" />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label for="width" style={{"fontWeight":"bold"}}>Width</Label>
                <Input type="number" value={props.fields.width || ''} min={0} onChange={(e) => props.handleShelfChange(e)} name="width" />
              </FormGroup>
            </Col>
            <Col md="6">
              <FormGroup>
                <Label for="flag" style={{"fontWeight":"bold"}}>Flag</Label>
                <Input
                  type="select"
                  name="flag"
                  className={props.fields.flag.toString() === "true" ? "text-danger" : ""}
                  value={props.fields.flag.toString()}
                  onChange={(e) => props.handleShelfChange(e)}
                >
                  <option value="false">Not flagged</option>
                  <option value="true">Flagged</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md="12">
              <FormGroup>
                <Label for="notes" style={{"fontWeight":"bold"}}>Notes</Label>
                <Input
                  type="textarea"
                  name="notes"
                  value={props.fields.notes || ''}
                  onChange={(e) => props.handleShelfChange(e)}
                  style={{"height": "100px"}}
                />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup style={{"marginTop": "40px"}}>
            <Button
              color="primary"
              style={{"float": "left"}}
              onClick={(e) => props.fields.new_shelf ? props.handleCreateShelf(e) : props.handleShelfUpdate(e)}
            >{ props.fields.new_shelf ? "Create shelf" : "Update shelf" }</Button>
            { !props.fields.new_shelf &&
              <Button
                color="danger"
                style={{"float": "right"}}
                onClick={(e) => {if (window.confirm('Are you sure you want to delete this shelf? Any trays on the shelf will appear as untrayed.')) {props.handleShelfDelete(props.fields.shelf_barcode, e)}}}
              >Delete shelf</Button>
            }
          </FormGroup>
        </Form>
      </Col>
    </Row>
  );
};

export default ManageShelves;
