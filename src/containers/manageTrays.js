import React, { useEffect, useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { displayItemList } from '../util/helpers';
import { success, warning } from '../components/toastAlerts';

const reducer = (state, action) => {
  switch (action.type) {
    case 'QUERY_CHANGE':
      return {
        ...state,
        query: action.payload,
      };
    case 'UPDATE_RESULTS':
      return {
        ...state,
        // fields: action.payload.data,
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
    case 'RESET':
      return {
        ...state,
        fields: {
          new_tray: false,
          tray_barcode: '',
          new_tray_barcode: '',
          shelf: '',
          depth: '',
          position: null,
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
    query: '',
    search_results: [],
    fields: {
      new_tray: false,
      tray_barcode: '',
      new_tray_barcode: '',
      shelf: '',
      depth: '',
      position: null,
      items: [],
      trayer: '',
      created: '',
      total: null,
    },
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const handleQueryChange = (e) => {
    e.preventDefault();
    dispatch({
      type: "QUERY_CHANGE",
      payload: e.target.value,
    });
  };

  const handleTrayChange = e => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        field: e.target.name,
        value: e.target.value,
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
        shelf: data.shelf,
        depth: data.depth,
        position: data.position,
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
    const results = await ContentSearch.trays(state.query);
    if (results && results[0]) {
      let items = [];
      for (let barcode of results[0].items) {
        items.push(barcode);
      }
      const fields = {
        new_tray: false,
        tray_barcode: results[0].tray_barcode ? results[0].tray_barcode : "",
        new_tray_barcode: "",
        shelf: results[0].shelf ? results[0].shelf : "",
        depth: results[0].shelf_depth ? results[0].shelf_depth : "",
        position: results[0].shelf_position ? results[0].shelf_position : null,
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
            shelf: '',
            depth: '',
            position: null,
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
    const data = {
      barcode: state.fields.tray_barcode,
      new_barcode: state.fields.new_tray_barcode || null,
      shelf: state.fields.shelf || null,
      depth: state.fields.depth || null,
      position: state.fields.position || null,
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

    // TODO: Validate tray barcode structure against settings

    const data = {
      barcode: state.fields.new_tray_barcode,
      shelf: state.fields.shelf || null,
      depth: state.fields.depth || null,
      position: state.fields.position || null,
      collection: null,
      items: [],
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
      <Row style={{"display": "flex", "paddingTop": "20px", "paddingLeft": "15px", "paddingRight": "20px"}}>
        <SearchForm
          query={state.query}
          handleSearch={handleSearch}
          handleQueryChange={handleQueryChange}
        />
        <Button color="warning" onClick={(e) => handleNewTraySelect(e)}>New tray</Button>
        { state.count &&
          <Button color="info" onClick={() => {navigator.clipboard.writeText(`${state.count} trays`)}} style={{"cursor": "grab", "marginLeft": "auto"}}>{`${state.count} trays total`}</Button>
        }
      </Row>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            { state.search_results
              ? Object.keys(state.search_results).map((tray, idx) => {
                  return (
                    <ResultDisplay
                      data={state.search_results[tray]}
                      handleTraySelect={handleTraySelect}
                      index={idx}
                      key={idx}
                    />
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
        name="query"
        placeholder="Tray barcode"
        value={props.query}
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
              <dd className="col-sm-9">
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
              <dt className="col-sm-3">Items</dt>
              <dd className="col-sm-9">
                {props.data.items.length}
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
              <Label for="tray" style={{"fontWeight":"bold"}}>Tray barcode</Label>
              <Input type="text" disabled value={props.fields.tray_barcode} name="tray_barcode" />
            </FormGroup>
          }
          <FormGroup>
            <Label for="tray" style={{"fontWeight":"bold"}}>New tray barcode</Label>
            <Input type="text" value={props.fields.new_tray_barcode || ''} onChange={(e) => props.handleTrayChange(e)} name="new_tray_barcode" />
          </FormGroup>
          <FormGroup>
            <Label for="tray" style={{"fontWeight":"bold"}}>Shelf</Label>
            <Input type="text" value={props.fields.shelf || ''} onChange={(e) => props.handleTrayChange(e)} name="shelf" />
          </FormGroup>
          <FormGroup>
            <Label for="depth" style={{"fontWeight":"bold"}}>Depth</Label>
            <Input type="select" style={{"width":"12em"}} value={props.fields.depth || ''} onChange={(e) => props.handleTrayChange(e)} name="depth">
              <option value="">(none)</option>
              <option value="Front">Front</option>
              <option value="Middle">Middle</option>
              <option value="Rear">Rear</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="position" style={{"fontWeight":"bold"}}>Position</Label>
            <Input type="number" style={{"width":"6em"}} name="position" value={props.fields.position || ''} max={props.settings.maxPosition} onChange={e => props.handleTrayChange(e)} />
          </FormGroup>
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
