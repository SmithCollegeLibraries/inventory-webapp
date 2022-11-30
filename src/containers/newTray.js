import React, { useEffect, useReducer, Fragment } from 'react';
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
      dispatch({ type: 'ADD_VERIFY', verify: {tray: '', barcodes: []} });
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
    const barcodesAsArray = original.barcodes ? original.barcodes.trim().split('\n') : [];
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

  const goBackToOriginal = e => {
    e.preventDefault();
    dispatch({ type: 'CHANGE_FORM', form: 'original'});
    dispatch({ type: 'ADD_VERIFY', verify: {tray: '', barcodes: []} });
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
        barcode: data.verify.tray,
        items: barcodesAsArray
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

  const handleProcessTrays = async (e) => {
    e.preventDefault();
    let submittedTrays = [];
    for (const tray of Object.keys(data.verified).map(key => data.verified[key])) {
      const response = await Load.newTray(tray);
      if (response) {
        success(`${tray.barcode} successfully added`);
        submittedTrays.push(tray.barcode);
      } else {
        failure(`Unable to add tray ${tray.barcode}. Please check that the tray and all items are not already in the system.`);
      }
    }
    removeItems(data.verified, submittedTrays);
  };

  const removeItems = (trayList, barcodes) => {
    // Create list of verified trays staged for submission,
    // without the tray that was just removed
    const newTrayList = Object.keys(trayList)
        .map(key => trayList[key])
        .filter(tray => !barcodes.includes(tray.barcode));
    dispatch({ type: 'UPDATE_VERIFIED', verified: newTrayList});
    localforage.setItem('tray', newTrayList);
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
    if (window.confirm('Are you sure you want to clear all staged trays as well as the current tray? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
      dispatch({ type: 'UPDATE_VERIFIED', verified: []});
      localforage.setItem('tray', {});
    }
  };

  return (
    <Fragment>
      <div style={{paddingTop: "10px"}}>
        <Button color={data.locked ? "success" : "primary"} onClick={(e) => lockCollection(e)}>{data.locked ? "Collection locked" : "Lock collection"}</Button>{' '}
      </div>
      <div style={{marginTop: "10px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
              <TrayFormOriginal
                handleEnter={handleEnter}
                collections={props.collections}
                lockCollection={lockCollection}
                trayLength={data.trayLength}
                original={data.original}
                handleOriginalOnChange={handleOriginalOnChange}
                handleOriginalSubmit={handleOriginalSubmit}
                form={data.form}
              />
              </CardBody>
            </Card>
          </Col>
          { data.form !== 'original'
            ? <Col md="4">
                <Card>
                  <CardBody>
                  <TrayFormVerify
                    handleEnter={handleEnter}
                    collections={props.collections}
                    trayLength={data.trayLength}
                    original={data.original}
                    verify={data.verify}
                    handleVerifyOnChange={handleVerifyOnChange}
                    handleVerifySubmit={handleVerifySubmit}
                    goBackToOriginal={goBackToOriginal}
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
              removeItems={removeItems}
            />
            { Object.keys(data.verified).map(items => items).length
              ? <>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleProcessTrays(e)} color="primary">Process new trays</Button>
                <Button style={{marginRight: '10px'}} color="danger" onClick={(e) => clearDisplayGrid(e)}>Clear all</Button>
              </>
              : ''
            }
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
      <Label for="tray">Tray{ ' ' }
      { props.verify.tray.length === props.trayLength
        ? <Badge color="success">{props.trayLength}</Badge>
        : <Badge color="danger">{props.verify.tray.length}</Badge>
      }
      </Label>
      <Input type="text" onKeyDown={props.handleEnter} name="tray" value={props.verify.tray} onChange={(e) => props.handleVerifyOnChange(e)} placeholder="Tray barcode" />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Barcodes</Label>
      <Input type="textarea" rows="10" value={props.verify.barcodes} onChange={(e) => props.handleVerifyOnChange(e)} name="barcodes" />
    </FormGroup>
    <Button style={{marginRight: '10px'}} onClick={(e) => props.handleVerifySubmit(e)} color="primary">Stage</Button>
    <Button style={{marginRight: '10px'}} color="warning" onClick={(e) => props.goBackToOriginal(e)}>Go back</Button>
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
        ? <><Badge color="success">{props.trayLength}</Badge> ✓</>
        : <Badge color="danger">{props.original.tray.length}</Badge>
      }
      </Label>
        <Input type="text" name="tray" onKeyDown={props.handleEnter} value={props.original.tray} onChange={(e) => props.handleOriginalOnChange(e)}  placeholder="Tray barcode" />
      </FormGroup>
      <FormGroup>
        <Label for="tray">Barcodes</Label>
        <Input type="textarea" value={props.original.barcodes} rows="10" onChange={(e) => props.handleOriginalOnChange(e)} name="barcodes" />
      </FormGroup>
      { props.original.tray.length === props.trayLength && props.form === 'original'
        ? <Button style={{marginRight: '10px'}} onClick={(e) => props.handleOriginalSubmit(e)} color="primary">Verify</Button>
        : <Button style={{marginRight: '10px'}} onClick={e => (e.preventDefault)} color="secondary">Verify</Button>
      }
    </Form>
  </div>
);

const Display = props => (
  Object.keys(props.data).map((tray, idx) => {
    return (
      <Card key={tray}>
        <CardBody>
          <dl className="row">
            <dt className="col-sm-3">Tray</dt>
              <dd className="col-sm-9">
                {props.data[tray].barcode}
              </dd>
              <dt className="col-sm-3">Items</dt>
                <dd className="col-sm-9">
                  {props.data[tray].items}
                </dd>
              <dt className="col-sm-3">Collection</dt>
              <dd className="col-sm-9">
                {props.data[tray].collection}
              </dd>
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeItems(props.data, [props.data[tray].barcode])
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
