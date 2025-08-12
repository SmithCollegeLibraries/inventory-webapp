import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { displayItemList } from '../util/helpers';
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
    case 'UNSHELVED_ONLY':
      return {
        ...state,
        unshelvedOnly: action.payload
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
          new_tray: false,
          tray_barcode: '',
          new_tray_barcode: '',
          size: '',
          collection: '',
          shelf: '',
          depth: '',
          position: null,
          full_count: null,
          flag: false,
          items: [],
          trayer: '',
          created: '',
        },
      }
    default:
      throw new Error();
  }
};

const ManageTrays = () => {
  const initialState = {
    barcode: '',
    flaggedOnly: false,
    unshelvedOnly: false,
    freeSpace: '',
    search_results: [],
    fields: {
      new_tray: false,
      tray_barcode: '',
      new_tray_barcode: '',
      size: '',
      collection: '',
      shelf: '',
      depth: '',
      position: null,
      full_count: null,
      flag: false,
      items: [],
      trayer: '',
      created: '',
      total: null,
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

  const handleUnshelvedOnlyChange = () => {
    dispatch({
      type: "UNSHELVED_ONLY",
      payload: !state.unshelvedOnly,
    });
  };

  const handleTrayChange = e => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        field: e.target.name,
        value: e.target.value === "true" ? true : e.target.value === "false" ? false : e.target.value,
      }
    });
  };

  const handleTraySelect = (data, e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_tray: false,
        tray_barcode: data.barcode,
        new_tray_barcode: '',
        size: data.size,
        collection: data.collection,
        shelf: data.shelf,
        depth: data.depth,
        position: data.position,
        full_count: data.full_count,
        flag: !!data.flag,
        items: data.items,
        trayer: data.trayer,
        created: data.created,
      }
    });
  }

  const handleNewTraySelect = (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_tray: true,
        tray_barcode: '',
        new_tray_barcode: '',
        size: '',
        collection: '',
        flag: false,
        shelf: '',
        depth: '',
        position: null,
        items: [],
        trayer: '',
        created: '',
      }
    });
  }

  const handleSearch = async (showWarnings = false) => {
    dispatch({ type: 'RESET_RESULTS', payload: '' });
    const results = await ContentSearch.trays(state.barcode, state.freeSpace, state.flaggedOnly, state.unshelvedOnly);
    if (results && results[0]) {
      let items = [];
      for (let barcode of results[0].items) {
        items.push(barcode);
      }
      const fields = {
        new_tray: false,
        tray_barcode: results[0].tray_barcode ? results[0].tray_barcode : "",
        new_tray_barcode: "",
        size: results[0]?.size?.code ? results[0].size.code : "",
        collection: results[0].collection ? results[0].collection : "",
        shelf: results[0].shelf ? results[0].shelf : "",
        depth: results[0].shelf_depth ? results[0].shelf_depth : "",
        position: results[0].shelf_position ? results[0].shelf_position : null,
        full_count: results[0].full_count ? results[0].full_count : null,
        flag: !!results[0].flag,
        items: items,
        trayer: results[0].trayer ? results[0].trayer : "",
        created: results[0].created ? results[0].created : "",
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
            tray_barcode: '',
            new_tray_barcode: '',
            size: '',
            collection: '',
            shelf: '',
            depth: '',
            position: null,
            full_count: null,
            flag: false,
            items: [],
            trayer: '',
            created: '',
          },
        }
      })
      if (showWarnings) {
        warning('No results found');
      }
    }
  };

  const handleTrayUpdate = async (e) => {
    e.preventDefault();
    // If the user supplies shelf, depth or position, double-check
    // with the user if they're not all present
    if ((state.fields.shelf || state.fields.depth || state.fields.position) &&
        !(state.fields.shelf && state.fields.depth && state.fields.position)) {
      if (!window.confirm("The location information provided is partial. Shelf, depth and position should normally be provided together. Are you sure you want to continue?")) {
        return;
      }
    }
    // Pass an empty string or 0 in order to clear the value on the API call
    const data = {
      barcode: state.fields.tray_barcode,
      new_barcode: state.fields.new_tray_barcode || null,
      size: state.fields.size === UNKNOWN ? "" : state.fields.size,
      collection: state.fields.collection === UNKNOWN ? "" : state.fields.collection,
      shelf: state.fields.shelf || "",
      depth: state.fields.depth || "",
      position: state.fields.position || 0,
      full_count: state.fields.full_count || "",
      flag: state.fields.flag,
    };
    const load = await Load.updateTray(data);
    if (load) {
      success(`Tray ${load['barcode']} successfully updated`);
      dispatch({ type: 'RESET', payload: ''});
      handleSearch(false);
    } else {
      // There should already be a 400/403 popup from the API
    }
  };

  const handleCreateTray = async (e) => {
    e.preventDefault();
    // If the user supplies shelf, depth or position, double-check
    // with the user if they're not all present
    if ((state.fields.shelf || state.fields.depth || state.fields.position) &&
        !(state.fields.shelf && state.fields.depth && state.fields.position)) {
      if (!window.confirm("The location information provided is partial. Shelf, depth and position should normally be provided together. Are you sure you want to continue?")) {
        return;
      }
    }

    const data = {
      barcode: state.fields.new_tray_barcode,
      size: state.fields.size || null,
      collection: state.fields.collection || null,
      shelf: state.fields.shelf || null,
      depth: state.fields.depth || null,
      position: state.fields.position || null,
      full_count: state.fields.full_count || null,
      flag: state.fields.flag || false,
    };
    const load = await Load.newTray(data);
    if (load) {
      success(`Tray ${load['barcode']} successfully added`);
      dispatch({ type: 'RESET', payload: '' });
      handleSearch(false);
    }
    else {
      // There should already be a 400/403 popup from the API
    }
  };

  const handleTrayDelete = async (barcode, e) => {
    const data = { barcode: barcode };
    const deleteTray = await Load.deleteTrayAndItems(data);
    if (deleteTray && 'active' in deleteTray && !deleteTray.active) {
      success("Tray and items successfully deleted");
      dispatch({ type: 'RESET', payload: '' });
      handleSearch(false);
    } else {
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

  // Get the total number of trays via the API on load
  useEffect(() => {
    async function fetchTrayCount() {
      const totalTrayCount = await Load.trayCount();
      if (totalTrayCount) {
        dispatch({
          type: 'UPDATE_COUNT',
          payload: totalTrayCount,
        });
      }
    }
    fetchTrayCount();
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
          freeSpace={state.freeSpace}
          handleSearch={handleSearch}
          handleQueryChange={handleQueryChange}
        />
        <Button
          color="warning"
          style={{ marginRight: "20px" }}
          onClick={(e) => handleNewTraySelect(e)}
        >
          New tray
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
        <FormGroup check style={{ textAlign: "right", display: "flex", alignItems: "center", marginRight: "20px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Input
              id="unshelvedOnlyCheckbox"
              type="checkbox"
              checked={state.unshelvedOnly}
              onChange={handleUnshelvedOnlyChange}
              style={{ marginTop: "0", marginBottom: "0", marginRight: "4px", verticalAlign: "middle", cursor: "pointer" }}
            />
            <Label
              for="unshelvedOnlyCheckbox"
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
              Unshelved only
            </Label>
          </div>
        </FormGroup>
        { state.count &&
          <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count.toLocaleString()} trays`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count.toLocaleString()} trays total`}</Button>
        }
      </Row>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            { state.search_results
              ? Object.keys(state.search_results).map((tray, idx) => {
                  return (
                    !state.flaggedOnly || state.search_results[tray].flag ?
                    ( !state.unshelvedOnly || !state.search_results[tray].shelf ?
                      <ResultDisplay
                        data={state.search_results[tray]}
                        handleTraySelect={handleTraySelect}
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
            { state.fields && ((state.fields.tray_barcode && state.fields.tray_barcode !== "") || state.fields.new_tray)
              ? <Card>
                  <CardBody>
                    <TrayForm
                      fields={state.fields}
                      handleTrayChange={handleTrayChange}
                      handleTrayUpdate={handleTrayUpdate}
                      handleTrayDelete={handleTrayDelete}
                      handleCreateTray={handleCreateTray}
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
            { state.fields && state.fields.tray_barcode && state.fields.tray_barcode !== ""
              ? <Card>
                  <CardBody>
                    <dl className="row">
                      <dt className="col-sm-3">Trayer</dt>
                      <dd className="col-sm-9">{state.fields.trayer ? state.fields.trayer.split(" ")[0] : "-"}</dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Date</dt>
                      <dd className="col-sm-9">{state.fields.created}</dd>
                    </dl>
                    <dl className="row">
                      <dt className="col-sm-3">Items ({state.fields.items.length})</dt>
                        <dd className="col-sm-9" style={{whiteSpace: 'pre'}}>
                          { state.fields.items && state.fields.items.length > 0 ? displayItemList(state.fields.items) : "-" }
                        </dd>
                    </dl>
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
    <Form inline style={{"float": "left"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="barcode"
        placeholder="Tray barcode"
        value={props.barcode}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Input
        type="number"
        style={{"marginRight": "10px", "width": "8em"}}
        name="free_space"
        placeholder="Free space"
        value={props.freeSpace}
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
      onClick={(e) => props.handleTraySelect(props.data, e)}
    >
      <CardBody>
        <Row>
          <dl className="row">
            <dt className="col-sm-3">Barcode</dt>
              <dd className={`col-sm-9${props.data.flag ? " text-danger" : ""}`}>
                {props.data.barcode}
              </dd>
              <dt className="col-sm-3">Created</dt>
              <dd className="col-sm-9" style={{whiteSpace: 'pre'}}>
                {props.data.created}
              </dd>
              <dt className="col-sm-3">Updated</dt>
              <dd className="col-sm-9">
                {props.data.updated}
              </dd>
              <dt className="col-sm-3">Collection</dt>
              <dd className="col-sm-9">
                {props.data.collection ?? '-'}
              </dd>
              <dt className="col-sm-3">Size</dt>
              <dd className="col-sm-9">
                {props.data?.size?.code ?? '-'}
              </dd>
              <dt className="col-sm-3">Items</dt>
              <dd className={ `col-sm-9 ${props.data.full_count === null || props.data.items.length < props.data.full_count ? 'text-info' : ( props.data.items.length > props.data.full_count ? 'text-danger' : '')}` }>
                {props.data.items.length} ({props.data.full_count !== null
                  ? (
                    props.data.items.length >= props.data.full_count
                      ? (props.data.items.length === props.data.full_count ? 'full' : 'overfull')
                      : `~${props.data.full_count - props.data.items.length} ${props.data.full_count - props.data.items.length === 1 ? "space" : "spaces" } free`
                    )
                  : props.data.items.length === 0 ? 'tray empty' : 'may have free space'})
              </dd>
          </dl>
        </Row>
      </CardBody>
    </Card>
  );
}

const TrayForm = (props) => {
  return (
    <Row>
      <Col>
        <Form autoComplete="off">
          { !props.fields.new_tray &&
            <FormGroup>
              <Label for="tray_barcode" style={{"fontWeight":"bold"}}>Tray barcode</Label>
              <Input type="text" disabled value={props.fields.tray_barcode} name="tray_barcode" />
            </FormGroup>
          }
          <FormGroup>
            <Label for="new_tray_barcode" style={{"fontWeight":"bold"}}>New tray barcode</Label>
            <Input type="text" value={props.fields.new_tray_barcode || ''} onChange={(e) => props.handleTrayChange(e)} name="new_tray_barcode" />
          </FormGroup>
          <Row>
            <Col md="8">
              <FormGroup>
                <Label for="collection" style={{"fontWeight":"bold"}}>Collection</Label>
                <Input type="select" value={props.fields.collection} onChange={(e) => props.handleTrayChange(e)} name="collection">
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
                <Input type="select" value={props.fields.size.code} onChange={(e) => props.handleTrayChange(e)} name="size">
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
            <Col md="4">
              <FormGroup>
                <Label for="tray" style={{"fontWeight":"bold"}}>Shelf</Label>
                <Input type="text" value={props.fields.shelf || ''} onChange={(e) => props.handleTrayChange(e)} name="shelf" />
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label for="depth" style={{"fontWeight":"bold"}}>Depth</Label>
                <Input type="select" value={props.fields.depth || ''} onChange={(e) => props.handleTrayChange(e)} name="depth">
                  <option value="">(none)</option>
                  <option value="Front">Front</option>
                  <option value="Middle">Middle</option>
                  <option value="Rear">Rear</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md="4">
              <FormGroup>
                <Label for="position" style={{"fontWeight":"bold"}}>Position</Label>
                <Input type="number" name="position" value={props.fields.position || ''} max={props.settings.maxPosition} onChange={e => props.handleTrayChange(e)} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md="7">
              <FormGroup>
                <Label for="full_count" style={{"fontWeight":"bold"}}>Number of items when full</Label>
                <Input type="number" style={{"width":"6em"}} value={props.fields.full_count || ''} onChange={(e) => props.handleTrayChange(e)} name="full_count" />
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
                  onChange={(e) => props.handleTrayChange(e)}
                >
                  <option value="false">Not flagged</option>
                  <option value="true">Flagged</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <FormGroup style={{"marginTop": "40px"}}>
            <Button
              color="primary"
              style={{"float": "left"}}
              onClick={(e) => props.fields.new_tray ? props.handleCreateTray(e) : props.handleTrayUpdate(e)}
            >{ props.fields.new_tray ? "Create tray" : "Update tray" }</Button>
            { !props.fields.new_tray &&
              <Button
                color="danger"
                style={{"float": "right"}}
                onClick={(e) => {if (window.confirm('Are you sure you want to delete this tray and all its items from the system?')) {props.handleTrayDelete(props.fields.tray_barcode, e)}}}
              >Delete tray and all items</Button>
            }
          </FormGroup>
        </Form>
      </Col>
    </Row>
  );
};

export default ManageTrays;
