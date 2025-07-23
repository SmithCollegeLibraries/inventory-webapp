import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { padShelfBarcode, displayTrayList } from '../util/helpers';
import { success, warning } from '../components/toastAlerts';

const UNKNOWN = 'Unknown';
const ANY_SIZE = '(Any)';
const ANY_COLLECTION = '(Any)';
const ANY_HEIGHT = '(Any)';
const ANY_WIDTH = '(Any)';
const HEIGHT_NOT_SET_DISPLAY = 'Not set';
const WIDTH_NOT_SET_DISPLAY = 'Not set';
const HEIGHT_NOT_SET_VALUE = '-';
const WIDTH_NOT_SET_VALUE = '-';
const ANY_SHELF_FULNESS = '(Any)';

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
    case 'UPDATE_HEIGHTS':
      return {
        ...state,
        heights: action.heights,
      };
    case 'UPDATE_WIDTHS':
      return {
        ...state,
        widths: action.widths,
      };
    case 'QUERY_CHANGE':
      return {
        ...state,
        query: {
          ...state.query,
          [action.payload.field]: action.payload.value,
        }
      };
    case 'FLAGGED_ONLY':
      return {
        ...state,
        flaggedOnly: action.payload,
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
          height: null,
          width: null,
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
    query: {
      barcode: '',
      size: null,
      collection: null,
      height: null,
      width: null,
      positions_free: '',
    },
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
      height: null,
      width: null,
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
    heights: [],
    widths: [],
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
        height: data.height,
        width: data.width,
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
        height: null,
        width: null,
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
    const response = await ContentSearch.shelves(
      padShelfBarcode(state.query.barcode),
      null,  // not searching by tray
      state.query.size,
      state.query.collection,
      state.query.height,
      state.query.width,
      state.query.positions_free,
      state.flaggedOnly,
    );
    if (response.resultCount > 0) {
      const results = response.results;
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
        height: results[0].height ?? null,
        width: results[0].width ?? null,
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
            height: null,
            width: null,
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
      height: state.fields.height || "",
      width: state.fields.width || "",
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
      barcode: state.fields.new_shelf_barcode,
      row: state.fields.row || null,
      side: state.fields.side || null,
      ladder: state.fields.ladder || null,
      rung: state.fields.rung || null,
      height: state.fields.height || null,
      width: state.fields.width || null,
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

  // Get list of heights from database on load
  useEffect(() => {
    const getHeights = async () => {
      const heights = await Load.getShelfHeights();
      dispatch({ type: 'UPDATE_HEIGHTS', heights: heights});
    };
    getHeights();
  }, []);

  // Get list of widths from database on load
  useEffect(() => {
    const getWidths = async () => {
      const widths = await Load.getShelfWidths();
      dispatch({ type: 'UPDATE_WIDTHS', widths: widths});
    };
    getWidths();
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
          // display: "flex",
          // alignItems: "center",
          paddingTop: "20px",
          paddingLeft: "15px",
          paddingRight: "20px"
        }}
      >
        <Col md="8" style={{paddingLeft: "5px"}}>
          <SearchForm
            sizes={state.sizes}
            collections={state.collections}
            heights={state.heights}
            widths={state.widths}
            barcode={state.query.barcode}
            sizeQuery={state.query.size}
            collectionQuery={state.query.collection}
            heightQuery={state.query.height}
            widthQuery={state.query.width}
            positionsFree={state.query.positions_free}
            flaggedOnly={state.flaggedOnly}
            handleSearch={handleSearch}
            handleQueryChange={handleQueryChange}
            handleFlaggedOnlyChange={handleFlaggedOnlyChange}
            handleNewShelfSelect={handleNewShelfSelect}
          />
        </Col>
        <Col md="4" style={{ textAlign: "right", margin: "0", padding: "0" }}>
          { state.count &&
            <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count.toLocaleString()} shelves`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count.toLocaleString()} shelves total`}</Button>
          }
        </Col>
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
                <CardBody>
                  <dt style={{marginBottom: "10px"}}>Trays ({state.fields.trays.length})</dt>
                  <dd>{displayTrayList(state.fields.trays)}</dd>
                </CardBody>
                </Card>
              : null
            }
          </Col>
        </Row>
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <FormGroup style={{display: "flex", alignItems: "baseline"}}>
        <Label for="size" style={{marginRight: "10px", marginBottom: "0px"}}>
          Size
        </Label>
        <Input
          type="select"
          name="size"
          value={props.sizeQuery || ""}
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
          value={props.collectionQuery || ""}
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
        <Label for="height" style={{marginRight: "10px"}}>
          Height
        </Label>
        <Input
          type="select"
          name="height"
          value={props.heightQuery || ANY_HEIGHT}
          style={{width: "7em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        >
          <option value="">{ANY_HEIGHT}</option>
          <option value={HEIGHT_NOT_SET_VALUE}>{HEIGHT_NOT_SET_DISPLAY}</option>
          { props.heights ? props.heights.map((i) => (
                <option value={i} key={i}>{i}″</option>
              ))
            : null
          }
        </Input>
        <Label for="width" style={{marginRight: "10px"}}>
          Width
        </Label>
        <Input
          type="select"
          name="width"
          value={props.widthQuery || ANY_WIDTH}
          style={{width: "7em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        >
          <option value="">{ANY_WIDTH}</option>
          <option value={WIDTH_NOT_SET_VALUE}>{WIDTH_NOT_SET_DISPLAY}</option>
          { props.widths ? props.widths.map((i) => (
                <option value={i} key={i}>{i}″</option>
              ))
            : null
          }
        </Input>
      </FormGroup>
      <FormGroup style={{display: "flex", alignItems: "baseline"}}>
        <Label for="barcode" style={{marginRight: "10px", marginBottom: "0px"}}>
          Barcode
        </Label>
        <Input
          type="text"
          name="barcode"
          placeholder="09R--1-"
          value={props.barcode}
          maxLength={7}
          style={{width: "8em", marginRight: "20px"}}
          onChange={(e) => props.handleQueryChange(e)}
        />
        <Label for="positions_free" style={{marginRight: "10px"}}>
          Free space
        </Label>
        <Input
          type="select"
          name="positions_free"
          value={props.positionsFree || ""}
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
        <Button color="primary" type="submit" style={{"marginRight": "10px"}}>Search</Button>
        <Button
          color="warning"
          style={{ marginRight: "20px" }}
          onClick={(e) => props.handleNewShelfSelect(e)}
        >
          New shelf
        </Button>
        <FormGroup check style={{ textAlign: "right", display: "flex", alignItems: "center", marginRight: "20px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Input
              id="flaggedOnlyCheckbox"
              type="checkbox"
              checked={props.flaggedOnly}
              onChange={props.handleFlaggedOnlyChange}
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
        {/* <Button color="warning" style={{"marginRight": "10px"}} onClick={(e) => props.handleClearSearch(e)}>Clear</Button> */}
      </FormGroup>
    </Form>
  );
};

const ResultDisplay = (props) => {
  return (
    <Card
      style={{paddingLeft: "10px", cursor: "pointer"}}
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
                  : props.data.trays.length === 0 ? 'shelf empty' : 'may have free space'})
              </dd>
              <dt className="col-sm-3">Height</dt>
              <dd className="col-sm-9">
                {props.data?.height ? props.data?.height + '″' : '-'}
              </dd>
              <dt className="col-sm-3">Width</dt>
              <dd className="col-sm-9">
                {props.data?.width ? props.data?.width + '″' : '-'}
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
            <Col md="4">
              <FormGroup>
                <Label for="height" style={{"fontWeight":"bold"}}>Height (in.)</Label>
                <Input type="number" value={props.fields.height || ''} min={0} onChange={(e) => props.handleShelfChange(e)} name="height" />
              </FormGroup>
            </Col>
            <Col md="3">
              <FormGroup>
                <Label for="width" style={{"fontWeight":"bold"}}>Width (in.)</Label>
                <Input type="number" value={props.fields.width || ''} min={0} onChange={(e) => props.handleShelfChange(e)} name="width" />
              </FormGroup>
            </Col>
            <Col md="5">
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
