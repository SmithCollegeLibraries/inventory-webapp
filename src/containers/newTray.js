import React, { useState, useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, failure, warning } from '../components/toastAlerts';

// TODO: get these numbers from settings
const BARCODE_LENGTH = 15;
const TRAY_BARCODE_LENGTH = 8;

const initialState = {
  original: {
    collection: '',
    tray: '',
    barcodes: []
  },
  verify: {
    tray: '',
    barcodes: []
  },
  // List of trays that have been verified
  verified: [],
  // Lists barcodes already checked on FOLIO, so we don't have to spam the server with API calls
  checkedOnFolio: [],
  form: 'original',
  trayValid: false,
  trayLength: TRAY_BARCODE_LENGTH,
  timeout: 0,
  email: '',
  locked: false
};

const trayReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ORIGINAL':
      return {
        ...state,
        original: action.original
      };
    case 'CHECKED_ON_FOLIO':
      return {
        ...state,
        checkedOnFolio: action.checkedOnFolio
      };
    case 'ADD_VERIFY':
      return {
        ...state,
        verify: action.verify
      };
    case 'UPDATE_VERIFIED':
      return {
        ...state,
        verified: action.verified
      };
    case 'LOCAL_VERIFIED':
      return {
        ...state,
        verified: action.verified
      };
    case 'CHANGE_FORM':
      return {
        ...state,
        form: action.form
      };
    case 'UPDATE_TRAY_LENGTH':
      return {
        ...state,
        trayLength: action.trayLength
      };
    case 'RESET':
      return {
        ...state,
        form: "original",
        original: {
          collection: state.locked === true ? state.original.collection : '',
          tray: '',
          barcodes: []
        },
        verify: {
          collection: state.locked === true ? state.verify.collection : '',
          tray: '',
          barcodes: []
        }
      };
    case 'LOCK_COLLECTION':
      return {
        ...state,
        locked: !state.locked
      };
    default:
      return state;
  }
};

const NewTray = (props) => {
  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedSearchTerm = useDebounce(data.original.barcodes, 500);

  // Anytime the DOM is updated, update local storage
  useEffect(() => {
    const getLocalItems = async () => {
      const local = await handleLocalStorage('tray') || [];
      dispatch({ type: 'LOCAL_VERIFIED', verified: local});
    };
    getLocalItems();
  }, []);

  useEffect(() => {
    if (props) {
      // const { settings } = props || '';
      let trayLength = TRAY_BARCODE_LENGTH;
      // if (settings !== "") {
      //   Object.keys(settings).map(items => {
      //     if (settings[items].type === 'tray_barcode_length') {
      //       trayLength = parseInt(settings[items].value);
      //     }
      //   });
      // }
      dispatch({ type: 'UPDATE_TRAY_LENGTH', trayLength: trayLength});
    }
  },[props]);

  // Check that the tray barcode is the correct length and
  // isn't in the system already
  useEffect(() => {
    const trayBarcodeToVerify = data.original.tray;

    const handleVerifyTrayUnused = async (tray) => {
      const data = { "barcode" : tray };
      const results = await Load.traySearch(data);
      if (results && results[0]) {
        failure(`${trayBarcodeToVerify} already exists in the system`);
        return false;
      } else {
        return true;
      }
    };

    if (trayBarcodeToVerify && trayBarcodeToVerify.length > 0) {
      // If tray is correct length, check that it's not already used.
      // (We're already showing the user that it's the wrong length,
      // so no need to give a popup alert.)
      if (trayBarcodeToVerify.length === TRAY_BARCODE_LENGTH) {
        const trayIsUnused = handleVerifyTrayUnused(trayBarcodeToVerify);
        if (!trayIsUnused) {
          failure(`Tray with barocde ${trayBarcodeToVerify} is already in use`);
        }
      }
    }
  });

  useEffect(() => {
    const handleVerifyBarcodesUnused = async (barcodes) => {
      const data = {
        barcodes: barcodes
      };
      const results = await Load.itemSearch(data);
      if (results && results[0] && results[0]["id"]) {
        results.map(item => {
          // TODO: Give more details on which tray and collection the item is in
          failure(`${item["barcode"]} is already trayed`);
          return false;
        });
      } else {
        return true;
      }
    };

    // Gives an alert to the user if a barcode has been entered that
    // doesn't exist in FOLIO. Only shows this warning once per barcode.
    // Once checked, barcodes are saved in state so that multiple API
    // calls aren't made to the FOLIO server every time the input field
    // is changed.
    const handleFolioRecordVerify = async (barcodes) => {
      for (const barcode of barcodes) {
        if (!data.checkedOnFolio.includes(barcode)) {
          const itemInFolio = await Load.itemInFolio(barcode);
          if (!itemInFolio) {
            warning(`Unable to locate FOLIO record for ${barcode}. Please verify record exists before submitting this barcode`);
          }
          dispatch({ type: 'CHECKED_ON_FOLIO', checkedOnFolio: [...data.checkedOnFolio, barcode]});
        }
      }
    };

    let warned = false;
    if (debouncedSearchTerm && debouncedSearchTerm.length > 0) {
      // Remove the last item: either it's empty, in which case we
      // don't want to do anything with the empty barcode, or it's an
      // unfinished barcode, in which case we don't want to verify it
      const barcodesToVerify = debouncedSearchTerm.split('\n').slice(0, -1);
      for (const barcode of barcodesToVerify) {
        if (barcode !== '') {
          if (!barcode.startsWith('3101')) {
            failure(`${barcode} does not begin with 3101`);
            warned = true;
          } else if (barcode.length !== BARCODE_LENGTH) {
            failure(`${barcode} must be ${BARCODE_LENGTH} characters long. You currently have ${barcode.length}`);
            warned = true;
          }
        }
      }
      if (!warned) {
        let barcodesUnused = handleVerifyBarcodesUnused(barcodesToVerify);
        if (barcodesUnused) {
          handleFolioRecordVerify(barcodesToVerify);
        }
      }
      // Show error if duplicate barcode exists
      if ((new Set(barcodesToVerify)).size !== barcodesToVerify.length) {
        // TODO: Show which barcode is duplicated
        failure("Duplicate barcode detected");
      }
    }
  },[debouncedSearchTerm]);

  const handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  }

  const handleOriginalOnChange = e => {
    e.preventDefault();
    let value = e.target.value;
    // Automatically remove non-numeric characters from tray field
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g,'');
    }
    const original = data.original;
    original[e.target.name] = value;
    dispatch({ type: 'ADD_ORIGINAL', original: original});
  }

  const handleOriginalSubmit = e => {
    e.preventDefault();
    // TODO: Automatically add newline to the end of this form if necessary
    if (handleInspectCollection() && handleInspectTray() && inspectBarcodes()) {
      dispatch({ type: 'CHANGE_FORM', form: 'verify'});
    }
  };

  const handleInspectCollection = () => {
    const { original } = data;
    if (!original.collection) {
      failure(`You must select a collection`);
      return false;
    } else {
      return true;
    }
  };

  const handleInspectTray = () => {
    const { original, trayLength } = data;
    if (original.tray.length !== trayLength) {
      failure(`Tray barcode must be ${trayLength} characters`);
      return false;
    } else {
      return true;
    }
  };

  const inspectBarcodes = () => {
    const { original } = data;
    const barcodesAsArray = original.barcodes.trim().split('\n');
    for (const barcode of barcodesAsArray) {
      if (barcode.length !== BARCODE_LENGTH) {
        failure(`Barcode ${barcodesAsArray[barcode]} is not ${BARCODE_LENGTH} characters`);
        return false;
      } else if (barcode.slice(0, 4) !== '3101') {
        failure(`Barcode ${barcodesAsArray[barcode]} does not begin with 3101`);
        return false;
      }
    }
    return true;
  }

  const handleVerifyOnChange = e => {
    e.preventDefault();
    const verify = data.verify;
    let value = e.target.value;
    // Automatically remove non-numeric characters from tray field
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g,'');
    }
    verify[e.target.name] = value;
    dispatch({ type: 'ADD_VERIFY', verify: verify});
  };

  const handleVerifySubmit = e => {
    e.preventDefault()
    // TODO: Do a diff on the original and verify so that it's clear which
    // barcode is the problem
    if (data.original.tray.trim() !== data.verify.tray.trim()) {
      failure('Mismatch! \n Original tray: \n' + data.original.tray + ' \n Verify tray: \n' + data.verify.tray);
    } else if (data.original.barcodes.trim() !== data.verify.barcodes.trim()) {
      failure('Mismatch! \n Original barcodes: \n' + data.original.barcodes + ' \n Verify barcodes: \n' + data.verify.barcodes);
    } else {
      let verified = data.verified;
      let barcodesAsArray = data.original.barcodes.trim().split('\n');
      verified[Date.now()] = {
        collection: data.original.collection,
        tray: data.verify.tray,
        barcodes: barcodesAsArray
      };
      localforage.setItem('tray', verified);
      dispatch({ type: 'UPDATE_VERIFIED', verified: verified});
      dispatch({ type: "RESET" });
    }
  };

  const handleDisplayChange = (e, key) => {
    const verified = data.verified;
    const values = {
      ...verified[key],
      [e.currentTarget.name]: e.currentTarget.value,
    };

    verified[key] = values;
    localforage.setItem('tray', verified);
    dispatch({ type: 'UPDATE_VERIFIED', verified: verified});
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    Object.keys(data.verified).map(async (items, idx) => {
      const response = await Load.newTray(data.verified[items]);
      if (response) {
        success(`${data.verified[items].tray} successfully added`);
        removeItem(items);
      } else {
        failure(`Unable to add tray ${data.verified[items].tray}. Please check that the tray and all items are not already in the system.`);
      }
    })
  };

  const removeItem = (index) => {
    // Create list of verified trays staged for submission,
    // without the tray that was just removed
    const filtered = Object.keys(data.verified)
      .filter(key => key !== index)
      .reduce((obj, key) => {
        obj[key] = data.verified[key];
        return obj;
      }, {});
    dispatch({ type: 'UPDATE_VERIFIED', verified: filtered});
    localforage.setItem('tray', filtered);
  };

  const handleEnter = (event) => {
    if (event.keyCode === 13) {
      const form = event.target.form;
      const index = Array.prototype.indexOf.call(form, event.target);
      form.elements[index + 1].focus();
      event.preventDefault();
    }
  };

  const lockCollection = e => {
    dispatch({ type: 'LOCK_COLLECTION' });
  };

  const clearDisplayGrid = e => {
    if (window.confirm('Are you sure you want to clear all currently staged trays? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
      dispatch({ type: 'UPDATE_VERIFIED', verified: []});
      localforage.setItem('tray', {});
    }
  };

  return (
    <Fragment>
      <div style={{paddingTop: "10px"}}>
        <Button color={data.locked ? "success" : "primary"} onClick={(e) => lockCollection(e)}>{data.locked ? "Collection locked" : "Lock collection"}</Button>{' '}
        <Button color="warning" onClick={(e) => clearDisplayGrid(e)}>Clear all</Button>
      </div>
      <div style={{marginTop: "50px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
              <TrayFormOriginal
                handleOriginalOnChange={handleOriginalOnChange}
                collections={props.collections}
                handleOriginalSubmit={handleOriginalSubmit}
                processRequests={handleProcess}
                verified={data.verified}
                trayLength={data.trayLength}
                original={data.original}
                handleEnter={handleEnter}
                lockCollection={lockCollection}
                handleVerifySubmit={handleVerifySubmit}
              />
              </CardBody>
            </Card>
          </Col>
          { data.form !== 'original'
            ? <Col md="4">
                <Card>
                  <CardBody>
                  <TrayFormVerify
                    handleVerifyOnChange={handleVerifyOnChange}
                    collections={props.collections}
                    handleVerifySubmit={handleVerifySubmit}
                    original={data.original}
                    trayLength={data.trayLength}
                    verify={data.verify}
                    handleEnter={handleEnter}
                  />
                  </CardBody>
                </Card>
              </Col>
            : ''
          }
          <Col>
            <Display
              data={data.verified}
              collections={props.collections}
              handleDisplayChange={handleDisplayChange}
              removeItem={removeItem}
            />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

const TrayFormVerify = props => (
  <Form>
    <FormGroup>
      <Label for="collections">Collections</Label>
      <Input type="select" value={props.original.collection} onChange={(e) => props.handleVerifyOnChange(e)} name="collection">
      { props.collections
        ? Object.keys(props.collections).map((items, idx) => (
            <option key={idx}>{props.collections[items].name}</option>
          ))
        : <option></option>
      }
      </Input>
    </FormGroup>
    <FormGroup>
      <Label for="tray">Tray
      { props.verify.tray.length === props.trayLength
        ? <Badge color="success">{props.trayLength}</Badge>
        : <Badge color="danger">{props.verify.tray.length}</Badge>
      }
      </Label>
      <Input type="text" onKeyDown={props.handleEnter} name="tray" value={props.verify.tray} onChange={(e) => props.handleVerifyOnChange(e)}  placeholder="Tray barcode" />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Barcodes</Label>
      <Input type="textarea" rows="10" value={props.verify.barcodes} onChange={(e) => props.handleVerifyOnChange(e)} name="barcodes" />
    </FormGroup>
    <Button onClick={(e) => props.handleVerifySubmit(e)} color="success">Verify</Button>
  </Form>
);

const TrayFormOriginal = props => (
  <div>
    <Form className="sticky-top">
      <FormGroup>
        <Label for="collections">Collections
      </Label>
        <Input type="select" value={props.original.collection} onChange={(e) => props.handleOriginalOnChange(e)} name="collection">
        <option>Select Collection</option>
        { props.collections
          ? Object.keys(props.collections).map((items, idx) => (
              <option value={props.collections[items].name} key={idx}>{props.collections[items].name}</option>
            ))
          : <option></option>
        }
        </Input>
      </FormGroup>
      <FormGroup>
      <Label for="tray">Tray{ ' ' }
      { props.original.tray.length === props.trayLength
        ? <Badge color="success">{props.trayLength}</Badge>
        : <Badge color="danger">{props.original.tray.length}</Badge>
      }
      </Label>
        <Input type="text" name="tray" onKeyDown={props.handleEnter} value={props.original.tray} onChange={(e) => props.handleOriginalOnChange(e)}  placeholder="Tray barcode" />
      </FormGroup>
      <FormGroup>
        <Label for="tray">Barcodes</Label>
        <Input type="textarea" value={props.original.barcodes} rows="10" onChange={(e) => props.handleOriginalOnChange(e)} name="barcodes" />
      </FormGroup>
      { props.original.tray.length === props.trayLength
        ? <Button style={{marginRight: '10px'}} onClick={(e) => props.handleOriginalSubmit(e)} color="primary">Submit</Button>
        : <Button style={{marginRight: '10px'}} onClick={e => (e.preventDefault)} color="secondary">Submit</Button>
      }
      { Object.keys(props.verified).map(items => items).length
        ? <Button onClick={(e) => props.processRequests(e)} color="success">Process data</Button>
        : ''
      }
    </Form>
  </div>
);

const Display = props => (
  Object.keys(props.data).map((items, idx) => {
    return (
      <Card key={items}>
        <CardBody>
          <dl className="row">
            <dt className="col-sm-3">Tray barcode</dt>
              <dd className="col-sm-9">
                {props.data[items].tray}
              </dd>
              <dt className="col-sm-3">Item barcodes</dt>
                <dd className="col-sm-9">
                  {props.data[items].barcodes}
                </dd>
              <dt className="col-sm-3">Collection</dt>
              <dd className="col-sm-9">
                {props.data[items].collection}
              </dd>
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeItem(items)
                }
              }}>
            Delete
          </Button>
        </CardBody>
      </Card>
    );
  })
);

export default NewTray;
