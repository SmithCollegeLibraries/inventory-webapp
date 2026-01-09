import React, { useReducer, useEffect } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { success, warning } from '../components/toastAlerts';

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_COLLECTIONS':
      return {
        ...state,
        collections: action.collections
      };
    case 'QUERY_CHANGE':
      return {
        ...state,
        query: action.payload
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
        folio_loaded: action.payload.folio_loaded,
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
    case 'RESET_RESULTS':
      return {
        ...state,
        search_results: [],
      };
    case 'RESET_SELECTION':
      return {
        ...state,
        fields: {
          folio_loaded: false,
          new_item: false,
          item_barcode: '',
          new_item_barcode: '',
          title: '',
          call_number: '',
          collection: '',
          tray: '',
          flag: false,
          status: '',
          shelf: '',
          depth: '',
          position: 0,
        },
      }
    default:
      throw new Error();
  }
};

const ManageItems = () => {
  const initialState = {
    collections: [],
    query: '',
    flaggedOnly: false,
    search_results: [],
    fields: {
      folio_loaded: false,
      new_item: false,
      item_barcode: '',
      new_item_barcode: '',
      title: '',
      call_number: '',
      collection: '',
      tray: '',
      status: '',
      flag: false,
      shelf: '',
      depth: '',
      position: 0,
      count: null,
    },
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const getCollections = async () => {
    const search = await ContentSearch.collections();
    dispatch({ type: "ADD_COLLECTIONS", collections: search});
  };

  const handleQueryChange = (e) => {
    e.preventDefault();
    let value = e.target.value;
    dispatch({
      type: "QUERY_CHANGE",
      payload: value,
    });
  };

  const handleFlaggedOnlyChange = () => {
    dispatch({
      type: "FLAGGED_ONLY",
      payload: !state.flaggedOnly,
    });
  };

  const handleItemChange = e => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        field: e.target.name,
        value: e.target.value === "true" ? true : e.target.value === "false" ? false : e.target.value,
      }
    });
  };

  const handleItemSelect = (data, e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_item: false,
        item_barcode: data.barcode,
        new_item_barcode: '',
        title: data.title ? data.title : '',
        call_number: data.callNumber ? data.callNumber : '',
        collection: data.collection ? data.collection : '',
        tray: data.tray ? data.tray.barcode : '',
        status: data.status ? data.status : '',
        flag: !!data.flag,
        shelf: data.tray ? data.tray.shelf : '',
        depth: data.tray ? data.tray.depth : '',
        position: data.tray ? data.tray.position : 0,
      }
    });
  }

  const handleNewItemSelect = (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_item: true,
        item_barcode: '',
        new_item_barcode: '',
        title: '',
        call_number: '',
        collection: '',
        status: '',
        flag: false,
        tray: '',
        shelf: '',
        depth: '',
        position: 0,
      }
    });
  }

  const handleSearch = async (showWarnings = false) => {
    // We don't want to show the results of an empty search (i.e. the most
    // recent items) just because the user updated or created an item, but
    // never clicked the search button. However, we do show results if they
    // were already showing, or if there is anything in the search box.
    const results = (showWarnings === true || state.search_results || state.query) ? await ContentSearch.items(state.query, state.flaggedOnly) : [];
    if (results && results[0]) {
      const fields = {
        new_item: false,
        item_barcode: results[0].item_barcode ? results[0].item_barcode : "",
        new_item_barcode: "",
        title: results[0].title ? results[0].title : "",
        call_number: results[0].callNnumber ? results[0].callNumber : "",
        collection: results[0].collection ? results[0].collection : "",
        tray: (results[0].tray && results[0].tray.barcode) ? results[0].tray.barcode : "",
        status: results[0].status ? results[0].status : "",
        flag: !!results[0].flag,
        shelf: (results[0].tray && results[0].tray.shelf) ? results[0].tray.shelf : "",
        depth: (results[0].tray && results[0].tray.depth) ? results[0].tray.depth : "",
        position: (results[0].tray && results[0].tray.position) ? results[0].tray.position : 0,
      }
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          folio_loaded: false,
          search_results: results,
          fields: fields,
        }
      });
      // Now look up these items in FOLIO to fill in title and call number info
      let updatedResults = await Promise.all(results.map(async item => {
        // Get the info from FOLIO
        let info = await Load.infoFromFolio(item.barcode);
        // Add the info to the item
        if (info) {
          item.title = info.title;
          item.callNumber = info.callNumber;
        }
        return item;
      }));
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          folio_loaded: true,
          search_results: updatedResults,
          fields: fields,
        }
      });
    }
    else {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          folio_loaded: false,
          search_results: [],
          fields: {
            new_item: false,
            item_barcode: '',
            new_item_barcode: '',
            title: '',
            call_number: '',
            collection: '',
            tray: '',
            status: '',
            flag: false,
            shelf: '',
            depth: '',
            position: 0,
          },
        }
      })
      if (showWarnings) {
        warning('No results');
      }
    }
  };

  const handleSearchButton = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET_RESULTS' });
    handleSearch(true);
  };

  const handleItemUpdate = async (e) => {
    e.preventDefault();
    const newBarcode = state.fields.new_item_barcode.trim();
    const data = {
      barcode: state.fields.item_barcode,
      new_barcode: newBarcode || null,
      collection: state.fields.collection,
      tray: state.fields.tray,
      status: state.fields.status,
      flag: state.fields.flag,
    };
    if (!newBarcode || await Load.itemInFolio(newBarcode) || window.confirm(`Item ${newBarcode} is not in FOLIO. Are you sure you want to continue?`)) {
      const load = await Load.updateItem(data);
      if (load) {
        success(`Item ${load['barcode']} successfully updated`);
        dispatch({ type: 'RESET_SELECTION' });
        handleSearch(false);
      } else {
        // There should already be a 400/403 popup from the API
      }
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    const data = {
      barcode: state.fields.new_item_barcode,
      collection: state.fields.collection,
      tray: state.fields.tray || null,
      status: state.fields.status || "New",
      flag: state.fields.flag || false,
    };
    const newBarcode = state.fields.new_item_barcode;
    if (await Load.itemInFolio(newBarcode) || window.confirm(`Item ${newBarcode} is not in FOLIO. Are you sure you want to continue?`)) {
      const load = await Load.newItem(data);
      if (load) {
        success(`Item ${load['barcode']} successfully added`);
        dispatch({ type: 'RESET_SELECTION' });
        handleSearch(false);
      } else {
        // There should already be a 400/403 popup from the API
      }
    }
  };

  const handleItemDelete = async (barcode, e) => {
    const data = { barcode: barcode };
    const deleteItem = await Load.deleteItem(data);
    if (deleteItem && 'active' in deleteItem && !deleteItem.active) {
      success("Item successfully deleted");
      dispatch({ type: 'RESET_SELECTION' });
      handleSearch(false);
    } else {
      // There should already be a 400/403 popup from the API
    }
  };

  useEffect(() => {
    getCollections()
  }, []);

  // Get the total number of items via the API on load
  useEffect(() => {
    async function fetchItemCount() {
      const totalItemCount = await Load.itemCount();
      if (totalItemCount) {
        dispatch({
          type: 'UPDATE_COUNT',
          payload: totalItemCount,
        });
      }
    }
    fetchItemCount();
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
          query={state.query}
          handleSearchButton={handleSearchButton}
          handleQueryChange={handleQueryChange}
        />
        <Button
          color="warning"
          style={{ marginRight: "20px" }}
          onClick={(e) => handleNewItemSelect(e)}
        >
          New item
        </Button>
        <FormGroup check style={{ textAlign: "right", display: "flex", alignItems: "center" }}>
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
              Show flagged items only
            </Label>
          </div>
        </FormGroup>
        { state.count && (
          <Button
            color="info"
            onClick={() => {
              navigator.clipboard.writeText(`${state.count.toLocaleString()} items`);
            }}
            style={{ cursor: "grab", marginLeft: "auto" }}
          >
            {`${state.count.toLocaleString()} items total`}
          </Button>
        )}
      </Row>
      <div style={{ marginTop: "20px" }}>
        <Row>
          <Col md="6">
            {state.search_results
              ? Object.keys(state.search_results).map((item, idx) => {
                  return (
                    !state.flaggedOnly || state.search_results[item].flag ?
                    <ResultDisplay
                      folio_loaded={state.folio_loaded}
                      data={state.search_results[item]}
                      handleItemSelect={handleItemSelect}
                      index={idx}
                      key={idx}
                    />
                    : null
                  );
                })
              : null}
          </Col>
          <Col md="6">
            {state.fields &&
            ((state.fields.item_barcode && state.fields.item_barcode !== "") ||
              state.fields.new_item) ? (
              <Card>
                <CardBody>
                  <ItemForm
                    fields={state.fields}
                    collections={state.collections}
                    handleItemChange={handleItemChange}
                    handleItemUpdate={handleItemUpdate}
                    handleItemDelete={handleItemDelete}
                    handleCreateItem={handleCreateItem}
                  />
                </CardBody>
              </Card>
            ) : null}
          </Col>
        </Row>
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form inline="true" style={{"float": "left"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearchButton(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="query"
        placeholder="Item barcode"
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
      onClick={(e) => props.handleItemSelect(props.data, e)}
    >
      <CardBody>
        <Row>
          <dl className="row">
            <dt className="col-sm-3">Barcode</dt>
            <dd className={`col-sm-9${props.data.flag ? " text-danger" : ""}`}>
              {props.data.barcode}
            </dd>
            <dt className="col-sm-3">Title</dt>
            <dd className="col-sm-9">
              { props.data.title ? props.data.title :
                (props.folio_loaded ? "(Title not available)" : "…")
              }
            </dd>
            <dt className="col-sm-3">Status</dt>
            <dd className="col-sm-9">
              {props.data.status}
            </dd>
            <dt className="col-sm-3">Tray</dt>
            <dd className="col-sm-9">
              {props.data.tray ? props.data.tray.barcode : "Not trayed" }
            </dd>
            <dt className="col-sm-3">Location</dt>
            <dd className="col-sm-9">
              {props.data.tray && props.data.tray.shelf ? `${props.data.tray.shelf} • ${props.data.tray.depth} • ${props.data.tray.position}` : "Not shelved" }
            </dd>
          </dl>
        </Row>
      </CardBody>
    </Card>
  );
}

const ItemForm = (props) => {
  return (
    <Row>
      <Col>
        <Form autoComplete="off">
          <Row>
            { !props.fields.new_item &&
              <FormGroup className="col-sm-6">
                <Label for="item_barcode" style={{"fontWeight":"bold"}}>Item barcode</Label>
                <Input type="text" disabled name="item_barcode" value={props.fields.item_barcode} />
              </FormGroup>
            }
            <FormGroup className="col-sm-6">
              <Label for="new_item_barcode" style={{"fontWeight":"bold"}}>New item barcode</Label>
              <Input type="text" name="new_item_barcode" value={props.fields.new_item_barcode || ''} onChange={(e) => props.handleItemChange(e)} />
            </FormGroup>
          </Row>
          { !props.fields.new_item &&
            <Row>
              <FormGroup className="col-sm-12">
                <Label for="title" style={{"fontWeight":"bold"}}>Title</Label>
                <Input type="text" disabled name="title" value={props.fields.title} />
              </FormGroup>
            </Row>
          }
          <Row>
            <FormGroup className="col-sm-6">
              <Label for="collection" style={{"fontWeight":"bold"}}>Collection</Label>
              <Input type="select" name="collection" value={props.fields.collection || ''} onChange={(e) => props.handleItemChange(e)}>
                <option value="">(none)</option>
                { props.collections
                  ? Object.keys(props.collections).map((objects, idx) => (
                      <option value={props.collections[objects].name} key={idx}>{props.collections[objects].name}</option>
                    ))
                  : null
                }
              </Input>
            </FormGroup>
            { !props.fields.new_item &&
              <FormGroup className="col-sm-6">
                <Label for="call_number" style={{"fontWeight":"bold"}}>Call number</Label>
                <Input type="text" disabled name="call_number" value={props.fields.call_number} />
              </FormGroup>
            }
          </Row>
          <Row>
            <FormGroup className="col-sm-4">
              <Label for="tray" style={{"fontWeight":"bold"}}>Tray</Label>
              <Input type="text" name="tray" value={props.fields.tray || ''} onChange={(e) => props.handleItemChange(e)} />
            </FormGroup>
            <FormGroup className="col-sm-4">
              <Label for="status" style={{"fontWeight":"bold"}}>Status</Label>
              <Input type="select" name="status" value={props.fields.status || ''} onChange={(e) => props.handleItemChange(e)}>
                <option value="">(none)</option>
                <option value="Trayed">Trayed</option>
                <option value="Circulating">Circulating</option>
                <option value="To return to campus">To return to campus</option>
                <option value="Returned to campus">Returned to campus</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Missing">Missing</option>
                <option value="Imported">Imported</option>
              </Input>
            </FormGroup>
            <FormGroup className="col-sm-4">
              <Label for="flag" style={{"fontWeight":"bold"}}>Flag</Label>
              <Input
                type="select"
                name="flag"
                className={props.fields.flag.toString() === "true" ? "text-danger" : ""}
                value={props.fields.flag.toString()}
                onChange={(e) => props.handleItemChange(e)}
              >
                <option value="false">Not flagged</option>
                <option value="true">Flagged</option>
              </Input>
            </FormGroup>
          </Row>
          { !props.fields.new_item &&
            <Row>
              <FormGroup className="col-sm-5">
                <Label for="shelf" style={{"fontWeight":"bold"}}>Shelf</Label>
                <Input type="text" disabled name="shelf" value={props.fields.shelf || ''} />
              </FormGroup>
              <FormGroup className="col-sm-4">
                <Label for="depth" style={{"fontWeight":"bold"}}>Depth</Label>
                <Input type="select" disabled name="depth" value={props.fields.depth || ''}>
                  <option value="">(none)</option>
                  <option value="Front">Front</option>
                  <option value="Middle">Middle</option>
                  <option value="Rear">Rear</option>
                </Input>
              </FormGroup>
              <FormGroup className="col-sm-3">
                <Label for="position" style={{"fontWeight":"bold"}}>Position</Label>
                <Input type="text" disabled={true} name="position" value={props.fields.position || 0} />
              </FormGroup>
            </Row>
          }
          <FormGroup style={{"marginTop": "10px"}}>
            <Button
              color="primary"
              style={{"float": "left"}}
              onClick={(e) => props.fields.new_item ? props.handleCreateItem(e) : props.handleItemUpdate(e) }
            >{ props.fields.new_item ? "Create item" : "Update item" }</Button>
            { !props.fields.new_item &&
              <Button
                color="danger"
                style={{"float": "right"}}
                onClick={(e) => {if (window.confirm('Are you sure you want to delete this item from the system?')) {props.handleItemDelete(props.fields.item_barcode, e)}}}
              >
                Delete item
              </Button>
            }
          </FormGroup>

          {/* If changing the barcode, popup confirm that the item isn't already in FOLIO. */}
        </Form>
      </Col>
    </Row>
  );
};


export default ManageItems;
