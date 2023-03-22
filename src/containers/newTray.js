import React, { useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import { success, failure } from '../components/toastAlerts';
import useDebounce from '../components/debounce';

// TODO: get these numbers from settings
const BARCODE_LENGTH = 15;
const TRAY_BARCODE_LENGTH = 8;
// const COLLECTION_PLACEHOLDER = '--- Select collection ---';
const DEFAULT_COLLECTION = 'Smith General Collections';
const trayStructure = /^1[0-9]{7}$/;


const NewTray = (props) => {
  const initialState = {
    original: {
      collection: DEFAULT_COLLECTION,
      tray: '',
      barcodes: ''
    },
    verify: {
      tray: '',
      barcodes: ''
    },
    verified: [],  // List of trays that have been verified and staged
    checkedInFolio: [],  // Items verified to be in FOLIO
    notInFolio: [],  // Items looked up in FOLIO that were not there
    form: 'original',
    trayValid: false,
    trayLength: TRAY_BARCODE_LENGTH,
    timeout: 0,
  };

  const trayReducer = (state, action) => {
    switch (action.type) {
      case 'ADD_ORIGINAL':
        return {
          ...state,
          original: action.original,
        };
      case 'CHECKED_IN_FOLIO':
        return {
          ...state,
          checkedInFolio: action.checkedInFolio,
        };
      case 'NOT_IN_FOLIO':
        return {
          ...state,
          notInFolio: action.notInFolio,
        };
      // We use this so that we can do a last FOLIO check before submission
      case 'CLEAR_FOLIO_CHECK':
        return {
          ...state,
          checkedInFolio: [],
          notInFolio: [],
        };
      case 'ADD_VERIFY':
        return {
          ...state,
          verify: action.verify,
        };
      case 'UPDATE_STAGED':
        return {
          ...state,
          verified: action.verified,
        };
      case 'CHANGE_FORM':
        return {
          ...state,
          form: action.form,
        };
      case 'RESET':
        return {
          ...state,
          form: "original",
          original: {
            collection: state.original.collection,
            tray: '',
            barcodes: '',
          },
          verify: {
            tray: '',
            barcodes: '',
          }
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedLeftPaneItems = useDebounce(data.original.barcodes);


  // Live verification functions, which also get called again on submission

  const verifyTrayLive = async (tray) => {
    // First, check that it's not in the list of staged trays
    if (data.verified) {
      const stagedTrays = Object.keys(data.verified).map(tray => data.verified[tray].barcode);
      if (stagedTrays.includes(tray)) {
        failure(`Tray ${tray} is already staged`);
        return false;
      }
    }
    // Then check if it is in the database
    const payload = { "barcode" : tray };
    const results = await Load.getTray(payload);
    if (results) {
      failure(`Tray ${tray} already exists in the system`);
      return false;
    }
    return true;
  };

  const verifyItemsLive = async (barcodes, verifyButtonClicked) => {
    const verifyItemsFree = async (barcodes) => {
      // First see whether it already exists in staged trays
      const arrayOfStagedItems = Object.keys(data.verified).map(tray => data.verified[tray].items);
      const stagedItems = [].concat.apply([], arrayOfStagedItems);
      for (const barcode of barcodes) {
        if (stagedItems.includes(barcode)) {
          failure(`Item ${barcode} is already staged`);
          return false;
        }
      }

      // Now see whether it is in the database
      const payload = {
        barcodes: barcodes
      };
      const results = await Load.itemSearch(payload);
      if (results !== null && results.length > 0 && results[0]["id"]) {
        results.map(item => {
          if (item["tray"]) {
            failure(`Item ${item["barcode"]} is already in tray ${item["tray"]}`);
          }
          else {
            failure(`Item ${item["barcode"]} is already in the system (untrayed)`);
          }
        });
        return false;
      }
      else {
        return true;
      }
    };

    // Gives an alert to the user if a barcode has been entered that
    // doesn't exist in FOLIO. Only shows this warning once per barcode.
    // Once checked, barcodes are saved in state so that multiple API
    // calls aren't made to the FOLIO server every time the input field
    // is changed.
    const verifyFolioRecord = async (barcodes, verifyButtonClicked) => {
      for (const barcode of barcodes) {
        if (barcode.length > 0) {
          if (data.checkedInFolio.includes(barcode)) {
            // Do nothing if it's already been checked in FOLIO
          }
          else if (data.notInFolio.includes(barcode)) {
            // If it's already been checked and not in FOLIO, don't give
            // another alert except on submit to avoid excessive popups --
            // unless the Verify button was just clicked, in which case
            // we want to explain why the user can't continue
            if (verifyButtonClicked) {
              failure(`Unable to locate FOLIO record for ${barcode}`);
            }
            return false;
          }
          else {
            const itemInFolio = await Load.itemInFolio(barcode);
            if (itemInFolio) {
              dispatch({ type: 'CHECKED_IN_FOLIO', checkedInFolio: [...data.checkedInFolio, barcode]});
            }
            else {
              dispatch({ type: 'NOT_IN_FOLIO', notInFolio: [...data.notInFolio, barcode]})
              failure(`Unable to locate FOLIO record for ${barcode}`);
              return false;
            }
          }
        }
      }
      return true;
    };

    // Empty trays halt the verification process, but we don't need an
    // alert live: this is done on submission
    if (!barcodes || barcodes.length === 0) {
      return false;
    }

    // Show error if duplicate barcode exists within the same input field
    if ((new Set(barcodes)).size !== barcodes.length) {
      // TODO: Show which barcode is duplicated
      failure("Please double-check that you do not have duplicate barcodes");
      return false;
    }

    for (const barcode of barcodes) {
      if (barcode !== '') {
        if (!barcode.startsWith('3101')) {
          failure(`Item ${barcode} does not begin with 3101`);
          return false;
        }
        else if (barcode.length !== BARCODE_LENGTH) {
          failure(`Barcode ${barcode} has ${barcode.length} characters (should be 15)`);
          return false;
        }
      }

      let itemsFree = await verifyItemsFree(barcodes);
      if (itemsFree) {
        let itemsInFolio = await verifyFolioRecord(barcodes, verifyButtonClicked);
        return itemsInFolio;
      }
      else {
        return false;
      }
    }

    // If nothing has failed, we can return true
    return true;
  }


  // Now the actual hooks that implement the live checks

  useEffect(() => {
    // Don't bother doing the live verification if it's not even the
    // correct length or doesn't begin with 1. (We're already showing the
    // user that it's incorrect with the badge, so no need to give a
    // popup alert.)
    if (trayStructure.test(data.original.tray)) {
      verifyTrayLive(data.original.tray);
    }
    else {
      if (data.original.tray.length === TRAY_BARCODE_LENGTH) {
        failure(`Valid tray barcodes must begin with 1.`);
      }
    }
  }, [data.original.tray]);

  useEffect(() => {
    // Don't try to verify barcodes if the item field is empty
    if (debouncedLeftPaneItems && debouncedLeftPaneItems.length > 0) {
      const allItems = debouncedLeftPaneItems.split('\n').filter(Boolean);
      // When checking live, don't check the last item if there's no
      // newline at the end, because that means the barcode may be
      // incomplete
      const lastChar = debouncedLeftPaneItems.slice(-1);
      const itemsToVerify = lastChar === '\n' ? allItems : allItems.slice(0, -1);
      verifyItemsLive(itemsToVerify, false);
    }
  }, [debouncedLeftPaneItems, data.checkedInFolio, data.notInFolio]);

  // Do the same verification for the middle pane

  useEffect(() => {
    if (trayStructure.test(data.verify.tray)) {
      verifyTrayLive(data.verify.tray);
    }
    else {
      if (data.verify.tray.length === TRAY_BARCODE_LENGTH) {
        failure(`Valid tray barcodes must begin with 1.`);
      }
    }
  }, [data.verify.tray]);

  useEffect(() => {
    if (data.verify.barcodes && data.verify.barcodes.length > 0) {
      const allItems = data.verify.barcodes.split('\n').filter(Boolean);
      const lastChar = data.verify.barcodes.slice(-1);
      const itemsToVerify = lastChar === '\n' ? allItems : allItems.slice(0, -1);
      verifyItemsLive(itemsToVerify, false);
    }
  }, [data.verify.barcodes, data.checkedInFolio, data.notInFolio]);

  // Add local storage to verified pane (staging area) on load
  useEffect(() => {
    const getLocalItems = async () => {
      const local = await handleLocalStorage('tray') || [];
      dispatch({ type: 'UPDATE_STAGED', verified: local});
    };
    getLocalItems();
  }, []);


  // The inspect functions take place when the original form is submitted

  // Collections aren't inspected live
  const inspectCollection = () => {
    const { original } = data;
    if (!original.collection) {
      failure(`You must select a collection`);
      return false;
    } else {
      return true;
    }
  };

  // When inspecting trays upon submission, we want to give a popup for
  // tray length, plus the ordinary live checking
  const inspectTray = async (tray) => {
    const { trayLength } = data;
    if (!trayStructure.test(tray)) {
      failure(`Tray barcode must be ${trayLength} characters long and begin with 1`);
      return false;
    }
    else {
      const liveVerification = await verifyTrayLive(tray);
      return liveVerification;
    }
  };

  const inspectItems = async (barcodes) => {
    if (!barcodes || barcodes.length === 0) {
      failure(`You cannot add an empty tray`);
      return false;
    }
    else {
      const itemsAsArray = barcodes.split('\n').filter(Boolean);
      // This is our final check, so we include the last item (we don't
      // check it live because it might not be complete yet)
      const verifiedAllItems = await verifyItemsLive(itemsAsArray, true);
      return verifiedAllItems;
    }
  }

  // Handling interactions with the form

  const handleEnter = (e) => {
    if (e.keyCode === 13) {
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      form.elements[index + 1].focus();
      e.preventDefault();
    }
  };

  const handleOriginalOnChange = e => {
    e.preventDefault();
    let value = e.target.value;
    // Automatically remove non-numeric characters from tray field;
    // this is important because the actual barcodes for trays are
    // prefixed with SM, which the barcode scanners will add to the input
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g,'');
    }
    // else if (e.target.name === 'collection') {
    //   value = e.target.value === COLLECTION_PLACEHOLDER ? '' : e.target.value;
    // }
    const original = data.original;
    original[e.target.name] = value;
    dispatch({ type: 'ADD_ORIGINAL', original: original});
  }

  const handleVerifyOnChange = e => {
    e.preventDefault();
    const verify = data.verify;
    let value = e.target.value;
    // Automatically remove non-numeric characters from tray field;
    // this is important because the actual barcodes for trays are
    // prefixed with SM, which the barcode scanners will add to the input
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g,'');
    }
    verify[e.target.name] = value;
    dispatch({ type: 'ADD_VERIFY', verify: verify});
  };

  const clearOriginal = e => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to clear this pane? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
    }
  };

  const goBackToOriginal = e => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to clear the verification pane and go back to editing the original list? This action cannot be undone.')) {
      dispatch({ type: 'CHANGE_FORM', form: 'original'});
      dispatch({ type: 'ADD_VERIFY', verify: {tray: '', barcodes: ''} });
    }
  };

  const handleTabOriginalSubmit = e => {
    if (e.keyCode === 9) {
      e.preventDefault();
      e.persist();
      handleOriginalSubmit(e);
    }
  };

  const handleTabVerifySubmit = e => {
    if (e.keyCode === 9) {
      e.preventDefault();
      e.persist();
      handleVerifySubmit(e);
    }
  };

  const handleOriginalSubmit = async (e) => {
    e.preventDefault();
    // If uncommented: clear the FOLIO verification arrays, so we can check
    // everything one last time
    // dispatch({ type: 'CLEAR_FOLIO_CHECK' });
    const collectionPassedInspection = inspectCollection();
    const trayPassedInspection = await inspectTray(data.original.tray);
    const itemsPassedInspection = await inspectItems(data.original.barcodes);
    if (collectionPassedInspection && trayPassedInspection && itemsPassedInspection) {
      dispatch({ type: 'CHANGE_FORM', form: 'verify'});
      dispatch({ type: 'ADD_VERIFY', verify: {tray: '', barcodes: ''} });
    }
    else {
      // Do nothing
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault()

    const findMismatches = (originalList, verifyList) => {
      const mismatchList = [];
      for (const item of originalList) {
        if (verifyList.indexOf(item) === -1) {
          mismatchList.push(item);
        }
      }
      for (const item of verifyList) {
        if (originalList.indexOf(item) === -1 && mismatchList.indexOf(item) === -1) {
          mismatchList.push(item);
        }
      }
      return mismatchList;
    }

    // Don't use CLEAR_FOLIO_CHECK here, because it causes race conditions
    // with the staging area
    const collectionPassedInspection = inspectCollection();
    const trayPassedInspection = await inspectTray(data.verify.tray);
    const itemsPassedInspection = await inspectItems(data.verify.barcodes);
    const originalItemsAsArray = data.original.barcodes.split('\n').filter(Boolean);
    const verifyItemsAsArray = data.verify.barcodes.split('\n').filter(Boolean);
    const mismatches = findMismatches(originalItemsAsArray, verifyItemsAsArray)

    if (collectionPassedInspection && trayPassedInspection && itemsPassedInspection) {
      if (data.original.tray !== data.verify.tray) {
        failure("Tray mismatch!");
      }
      else if (mismatches.length !== 0) {
        failure(`Item mismatch! Please check ${mismatches.join(', ')}`);
      }
      else {
        let verified = data.verified;
        verified[data.verified.length] = {
          collection: data.original.collection,
          barcode: data.verify.tray,
          items: originalItemsAsArray
        };
        localforage.setItem('tray', verified);
        dispatch({ type: 'UPDATE_STAGED', verified: verified});
        dispatch({ type: "RESET" });
        window.location.reload();
      }
    }
    else {
      // Do nothing
    }
  };

  // Staged items area

  const handleDisplayChange = (e, key) => {
    const verified = data.verified;
    const values = {
      ...verified[key],
      [e.currentTarget.name]: e.currentTarget.value,
    };

    verified[key] = values;
    localforage.setItem('tray', verified);
    dispatch({ type: 'UPDATE_STAGED', verified: verified});
  };

  const handleProcessTrays = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      let submittedTrays = [];
      for (const tray of Object.keys(data.verified).map(key => data.verified[key])) {
        const response = await Load.newTray(tray);
        if (response) {
          success(`Tray ${tray.barcode} successfully added`);
          submittedTrays.push(tray.barcode);
        }
      }
      removeItems(submittedTrays);
      dispatch({ type: "RESET" });
    }
    else {
      failure("You must be connected to the internet to process trays. Please check your internet connection.");
    }
  };

  // We want to be able to remove more than one tray at a time from the
  // staging list because after submitting, we are keeping track of
  // which ones have been submitted and need to remove all the submitted
  // trays at once
  const removeItems = (trayBarcodes) => {
    const stagedTrays = data.verified;
    // Create list of verified trays staged for submission,
    // without the trays that were just removed
    const newTrayList = Object.keys(stagedTrays)
        .map(key => stagedTrays[key])
        .filter(tray => !trayBarcodes.includes(tray.barcode));
    dispatch({ type: 'UPDATE_STAGED', verified: newTrayList});
    localforage.setItem('tray', newTrayList);
  };

  const clearDisplayGrid = e => {
    if (window.confirm('Are you sure you want to clear all staged trays as well as the current tray? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
      dispatch({ type: 'UPDATE_STAGED', verified: []});
      localforage.setItem('tray', {});
    }
  };

  const handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  }

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <TrayFormOriginal
                  handleEnter={handleEnter}
                  // collections={props.collections}
                  trayLength={data.trayLength}
                  original={data.original}
                  handleOriginalOnChange={handleOriginalOnChange}
                  handleOriginalSubmit={handleOriginalSubmit}
                  handleTabOriginalSubmit={handleTabOriginalSubmit}
                  clearOriginal={clearOriginal}
                  form={data.form}
                  disabled={data.form === 'verify'}
                  disabledSubmit={!trayStructure.test(data.original.tray) || data.original.barcodes.length === 0}
                  disabledClear={data.original.tray.length === 0 && data.original.barcodes.length === 0}
                  trayStructure={trayStructure}
                  TRAY_BARCODE_LENGTH={TRAY_BARCODE_LENGTH}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card>
              <CardBody>
              <TrayFormVerify
                handleEnter={handleEnter}
                // collections={props.collections}
                trayLength={data.trayLength}
                original={data.original}
                verify={data.verify}
                handleVerifyOnChange={handleVerifyOnChange}
                handleVerifySubmit={handleVerifySubmit}
                handleTabVerifySubmit={handleTabVerifySubmit}
                goBackToOriginal={goBackToOriginal}
                disabled={data.form === 'original'}
                disabledSubmit={!trayStructure.test(data.verify.tray) || data.verify.barcodes.length === 0}
                trayStructure={trayStructure}
                TRAY_BARCODE_LENGTH={TRAY_BARCODE_LENGTH}
              />
              </CardBody>
            </Card>
          </Col>
          <Col>
            <Display
              data={data.verified}
              // collections={props.collections}
              handleDisplayChange={handleDisplayChange}
              removeItems={removeItems}
            />
            { Object.keys(data.verified).map(items => items).length
              ? <>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleProcessTrays(e)} color="primary">Process all</Button>
                <Button style={{marginRight: '10px'}} color="danger" onClick={(e) => clearDisplayGrid(e)}>Delete all</Button>
              </>
              : ''
            }
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

const TrayFormOriginal = props => (
  <div>
    <Form className="sticky-top" autoComplete="off">
      {/* <FormGroup>
        <Label for="collections">Collection</Label>
        <Input type="select" value={props.original.collection} onChange={(e) => props.handleOriginalOnChange(e)} name="collection" disabled={props.disabled}>
          <option>{ COLLECTION_PLACEHOLDER }</option>
          { props.collections
            ? Object.keys(props.collections).map((items, idx) => (
                <option value={props.collections[items].name} key={idx}>{props.collections[items].name}</option>
              ))
            : <option></option>
          }
        </Input>
      </FormGroup> */}
      <FormGroup>
        <Label for="tray">Tray{ ' ' }
          { props.trayStructure.test(props.original.tray)
            ? <><Badge color="success">{props.original.tray.length}</Badge> ✓</>
            : <Badge color={props.TRAY_BARCODE_LENGTH === props.original.tray.length ? "warning" : "danger"}>{props.original.tray.length}</Badge>
          }
        </Label>
        <Input
          type="text"
          name="tray"
          placeholder="Tray barcode"
          value={props.original.tray}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
          disabled={props.disabled}
          autoFocus={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="barcodes">Items</Label>
        <Input
          type="textarea"
          rows="10"
          name="barcodes"
          value={props.original.barcodes}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            e.preventDefault()
            return false;
          }}
          disabled={props.disabled}
          onKeyDown={props.handleTabOriginalSubmit}
        />
      </FormGroup>
      <Button
          style={{marginRight: '10px'}}
          onClick={(e) => props.handleOriginalSubmit(e)}
          color="primary"
          disabled={props.disabled || props.disabledSubmit}
        >
        Verify
      </Button>
      <Button
          style={{marginRight: '10px'}}
          color="warning"
          onClick={(e) => props.clearOriginal(e)}
          disabled={props.disabled || props.disabledClear}>
        Clear
      </Button>
    </Form>
  </div>
);

const TrayFormVerify = props => (
  <Form autoComplete="off">
    {/* <FormGroup>
      <Label for="collections">Collection</Label>
      <Input type="text" value={ props.original.collection === COLLECTION_PLACEHOLDER ? "" : props.original.collection } onChange={(e) => props.handleVerifyOnChange(e)} name="collection" disabled={true} />
    </FormGroup> */}
    <FormGroup>
      <Label for="tray">Tray{ ' ' }
          { props.trayStructure.test(props.verify.tray) && props.original.tray === props.verify.tray
            ? <><Badge color="success">{props.verify.tray.length}</Badge> ✓</>
            : <Badge color={props.TRAY_BARCODE_LENGTH === props.verify.tray.length ? "warning" : "danger"}>{props.verify.tray.length}</Badge>
          }
      </Label>
      <Input
        type="text"
        name="tray"
        placeholder={ props.disabled ? "" : "Tray barcode" }
        value={props.verify.tray}
        onChange={(e) => props.handleVerifyOnChange(e)}
        onPaste={(e)=>{
          e.preventDefault()
          return false;
        }}
        onKeyDown={props.handleEnter}
        disabled={props.disabled}
      />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Items</Label>
      <Input
        type="textarea"
        rows="10"
        name="barcodes"
        value={props.verify.barcodes}
        onChange={(e) => props.handleVerifyOnChange(e)}
        onPaste={(e)=>{
          e.preventDefault()
          return false;
        }}
        disabled={props.disabled}
      />
    </FormGroup>
    <Button
        style={{marginRight: '10px'}}
        onClick={(e) => props.handleVerifySubmit(e)}
        color="primary"
        disabled={props.disabled || props.disabledSubmit}
          onKeyDown={props.handleTabVerifySubmit}
      >
      Add
    </Button>
    <Button
        style={{marginRight: '10px'}}
        color="warning"
        onClick={(e) => props.goBackToOriginal(e)}
        disabled={props.disabled}
      >
      Go back
    </Button>
  </Form>
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
            <dd className="col-sm-9" style={{whiteSpace: 'pre'}}>
              {props.data[tray].items ? props.data[tray].items.join('\n') : ''}
            </dd>
            {/* <dt className="col-sm-3">Collection</dt>
            <dd className="col-sm-9">
              {props.data[tray].collection}
            </dd> */}
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeItems([props.data[tray].barcode])
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
