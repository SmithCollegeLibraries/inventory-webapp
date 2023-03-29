import React, { useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, warning, failure } from '../components/toastAlerts';

// TODO: get these numbers from settings
const TRAY_BARCODE_LENGTH = 8;
// const COLLECTION_PLACEHOLDER = '--- Select collection ---';
const DEFAULT_COLLECTION = 'Smith General Collections';
const trayStructure = /^1[0-9]{7}$/;
const itemStructure = /^3101[0-9]{11}$/;


const NewTray = (props) => {
  const initialState = {
    trayLength: TRAY_BARCODE_LENGTH,  // Length of tray barcodes - constant for now
    form: 'original',  // Which form is currently being displayed (original or verify)
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

    // Containers for all the possible states of verifying trays and items
    trayCheckStarted: [],
    trayBadStaged: [],
    trayBadSystem: [],
    trayGood: [],
    itemUsedCheckStarted: [],
    itemUsedBadStaged: [],
    itemUsedBadSystem: [],
    itemUsedGood: [],
    itemFolioCheckStarted: [],
    itemFolioBad: [],
    itemFolioGood: [],
    itemAlreadyAlerted: [],
  };

  const trayReducer = (state, action) => {
    switch (action.type) {
      case 'ADD_ORIGINAL':
        return {
          ...state,
          original: action.original,
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
      case 'TRAY_CHECK_STARTED':
        return {
          ...state,
          trayCheckStarted: [...state.trayCheckStarted, action.tray],
        };
      case 'TRAY_BAD_STAGED':
        return {
          ...state,
          trayBadStaged: [...state.trayBadStaged, action.tray],
        };
      case 'TRAY_BAD_SYSTEM':
        return {
          ...state,
          trayBadSystem: [...state.trayBadSystem, action.tray],
        };
      case 'TRAY_GOOD':
        return {
          ...state,
          trayGood: [...state.trayGood, action.tray],
        };
      case 'ITEM_USED_CHECK_STARTED':
        return {
          ...state,
          itemUsedCheckStarted: [...state.itemUsedCheckStarted, action.item],
        };
      case 'ITEM_USED_BAD_STAGED':
        return {
          ...state,
          itemUsedBadStaged: [...state.itemUsedBadStaged, action.item],
        };
      case 'ITEM_USED_BAD_SYSTEM':
        return {
          ...state,
          itemUsedBadSystem: [...state.itemUsedBadSystem, action.item],
        };
      case 'ITEM_USED_GOOD':
        return {
          ...state,
          itemUsedGood: [...state.itemUsedGood, action.item],
        };
      case 'ITEM_FOLIO_CHECK_STARTED':
        return {
          ...state,
          itemFolioCheckStarted: [...state.itemFolioCheckStarted, action.item],
        };
      case 'ITEM_FOLIO_BAD':
        return {
          ...state,
          itemFolioBad: [...state.itemFolioBad, action.item],
        };
      case 'ITEM_FOLIO_GOOD':
        return {
          ...state,
          itemFolioGood: [...state.itemFolioGood, action.item],
        };
      case 'ITEM_ALREADY_ALERTED':
        return {
          ...state,
          itemAlreadyAlerted: [...state.itemAlreadyAlerted, action.item],
        };
      case 'CLEAR_ALREADY_ALERTED':
        return {
          ...state,
          itemAlreadyAlerted: [],
        };
      case 'CHANGE_FORM':
        return {
          ...state,
          form: action.form,
        };
      case 'RESET':
        return {
          ...state,
          trayLength: TRAY_BARCODE_LENGTH,
          form: "original",
          original: {
            collection: state.original.collection,
            tray: '',
            barcodes: '',
          },
          verify: {
            tray: '',
            barcodes: '',
          },
          verified: [],  // List of trays that have been verified and staged

          // Containers for all the possible states of verifying trays and items
          trayCheckStarted: [],
          trayBadStaged: [],
          trayBadSystem: [],
          trayGood: [],
          itemUsedCheckStarted: [],
          itemUsedBadStaged: [],
          itemUsedBadSystem: [],
          itemUsedGood: [],
          itemFolioCheckStarted: [],
          itemFolioBad: [],
          itemFolioGood: [],
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedLeftPaneItems = useDebounce(data.original.barcodes);
  const debouncedMiddlePaneItems = useDebounce(data.verify.barcodes);


  // Live verification functions, which also get called again on submission

  const errorPath = "https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233574/error.mp3";
  const errorAudio = new Audio(errorPath);
  const failureIfNew = (barcode, message) => {
    if (!data.itemAlreadyAlerted.includes(barcode)) {
      failure(message);
      dispatch({ type: 'ITEM_ALREADY_ALERTED', item: barcode });
    }
    else {
      errorAudio.play();
    }
  };

  const verifyTrayLive = async (tray) => {
    // First, check that it's not in the list of staged trays
    if (data.verified) {
      const stagedTrays = Object.keys(data.verified).map(tray => data.verified[tray].barcode);
      if (stagedTrays.includes(tray)) {
        failure(`Tray ${tray} is already staged.`);
        dispatch({ type: 'TRAY_BAD_STAGED', tray: tray });
        return false;
      }
    }
    // Then check if it is in the database
    const payload = { "barcode" : tray };
    const results = await Load.getTray(payload);
    if (results) {
      failure(`Tray ${tray} is already in the system.`);
      dispatch({ type: 'TRAY_BAD_SYSTEM', tray: tray });
      return false;
    }
    else {
      dispatch({ type: 'TRAY_GOOD', tray: tray });
      return true;
    }
  };

  const verifyItemsLive = async (barcodes) => {

    const verifyItemsFree = async (barcodes) => {
      console.log("Verifying items free", barcodes);
      // First see whether it already exists in staged trays
      const arrayOfStagedItems = Object.keys(data.verified).map(tray => data.verified[tray].items);
      const stagedItems = [].concat.apply([], arrayOfStagedItems);
      for (const barcode of barcodes) {
        if (stagedItems.includes(barcode)) {
          failureIfNew(barcode, `Item ${barcode} is already staged`);
          dispatch({ type: 'ITEM_USED_BAD_STAGED', item: barcode });
          return false;
        }
      }

      // Now see whether it is in the database
      const payload = {
        barcodes: barcodes
      };
      const fullResults = await Load.itemSearch(payload);
      // Get list of results as barcodes
      const resultBarcodes = fullResults.map(item => item["barcode"]);
      // For each barcode that's not in the results, add it to the list
      // of items that are already checked against the system
      console.log(barcodes);
      for (const barcode of barcodes) {
        console.log("trying", barcode);
        if (!resultBarcodes.includes(barcode)) {
          console.log("adding", barcode);
          dispatch({ type: 'ITEM_USED_GOOD', item: barcode });
        }
      }
      fullResults.forEach(item => {
        if (item["tray"]) {
          failureIfNew(item["barcode"], `Item ${item["barcode"]} is already in tray ${item["tray"]}.`);
          dispatch({ type: 'ITEM_USED_BAD_SYSTEM', item: item["barcode"] });
          return false;
        }
        else {
          failureIfNew(item["barcode"], `Item ${item["barcode"]} is already in the system (untrayed).`);
          dispatch({ type: 'ITEM_USED_BAD_SYSTEM', item: item["barcode"] });
          return false;
        }
      });
      return true;
    };

    const verifyFolioRecord = async (barcodes) => {
      for (const barcode of barcodes) {
        if (barcode.length > 0) {
          const itemInFolio = await Load.itemInFolio(barcode);
          if (itemInFolio) {
            dispatch({ type: 'ITEM_FOLIO_GOOD', item: barcode });
          }
          else {
            failureIfNew(barcode, `Unable to locate FOLIO record for ${barcode}.`);
            dispatch({ type: 'ITEM_FOLIO_BAD', item: barcode });
            return false;
          }
        }
      }
      return true;
    };

    // Gives an alert to the user if a barcode has been entered that
    // doesn't exist in FOLIO. Only shows this warning once per barcode.
    // Once checked, barcodes are saved in state so that multiple API
    // calls aren't made to the FOLIO server every time the input field
    // is changed.

    let barcodesToLookupInSystem = [];
    let barcodesToLookupInFolio = [];
    let brokenBarcodes = [];
    for (const barcode of barcodes) {
      if (barcode === '') {
        // Don't verify empty "barcodes"
      }
      else if (data.itemUsedGood.includes(barcode) && data.itemFolioGood.includes(barcode)) {
        // These are known to be good, so don't verify them again
      }
      else if (!itemStructure.test(barcode)) {
        failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes must begin with 3101 and be 15 characters long.`);
        brokenBarcodes.push(barcode);
      }
      else if (data.itemUsedBadStaged.includes(barcode)) {
        failureIfNew(barcode, `Item ${barcode} is already staged.`);
        brokenBarcodes.push(barcode);
      }
      else if (data.itemUsedBadSystem.includes(barcode)) {
        failureIfNew(barcode, `Item ${barcode} is already in the system.`);
        brokenBarcodes.push(barcode);
      }
      else if (data.itemFolioBad.includes(barcode)) {
        failureIfNew(barcode, `Unable to locate FOLIO record for ${barcode}.`);
        brokenBarcodes.push(barcode);
      }
      else {
        if (!data.itemUsedCheckStarted.includes(barcode) && !data.itemUsedGood.includes(barcode)) {
          barcodesToLookupInSystem.push(barcode);
        }
        if (!data.itemFolioCheckStarted.includes(barcode) && !data.itemFolioGood.includes(barcode)) {
          barcodesToLookupInFolio.push(barcode);
        }
      }
    }

    for (const barcode of barcodesToLookupInSystem) {
      dispatch({ type: 'ITEM_USED_CHECK_STARTED', item: barcode });
    }
    let allItemsFree = verifyItemsFree(barcodesToLookupInSystem);
    for (const barcode of barcodesToLookupInFolio) {
      dispatch({ type: 'ITEM_FOLIO_CHECK_STARTED', item: barcode });
    }
    let allItemsInFolio = verifyFolioRecord(barcodesToLookupInFolio);
    if (await allItemsFree !== true) {
      return false;
    }
    if (await allItemsInFolio !== true) {
      return false;
    }

    // If we've made it this far, all barcodes are valid
    return brokenBarcodes === [];
  };

  const verifyItemsOnSubmit = (barcodes) => {
    // For each barcode, confirm that it's checked against the system
    // and that it's checked against FOLIO
    for (const barcode of barcodes) {
      if (data.itemUsedGood.includes(barcode)) {
        if (data.itemFolioGood.includes(barcode)) {
          // Do nothing if the barcode is in both lists
        }
        else {
          if (data.itemFolioBad.includes(barcode)) {
            failureIfNew(barcode, `Unable to locate FOLIO record for ${barcode}.`);
            return false;
          }
          else {
            warning(`Verification of item ${barcode} in FOLIO may still be pending. Please try again in a few seconds, and report this problem if it continues.`);
            return false;
          }
        }
      }
      else {
        if (!itemStructure.test(barcode)) {
          failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes must begin with 3101 and be 15 characters long.`);
          return false;
        }
        else if (data.itemUsedBadStaged.includes(barcode)) {
          failureIfNew(barcode, `Item ${barcode} is already staged.`);
          return false;
        }
        else if (data.itemUsedBadSystem.includes(barcode)) {
          failureIfNew(barcode, `Item ${barcode} is already in the system.`);
          return false;
        }
        else {
          warning(`Verification of item ${barcode} in the system may be pending. Please try again in a few seconds, and report this problem if it continues.`);
          return false;
        }
      }
    }
    return true;
  }

  // Now the actual hooks that implement the live checks

  useEffect(() => {
    // Don't bother doing the live verification if it's not even the
    // correct length or doesn't begin with 1. (We're already showing the
    // user that it's incorrect with the badge, so no need to give a
    // popup alert.)
    if (trayStructure.test(data.original.tray)) {
      if (data.trayCheckStarted.includes(data.original.tray)) {
        // Do nothing if the tray is already being checked
      }
      else {
        dispatch({ type: 'TRAY_CHECK_STARTED', tray: data.original.tray });
        verifyTrayLive(data.original.tray);
      }
    }
    else {
      if (data.original.tray.length === TRAY_BARCODE_LENGTH) {
        failure(`Valid tray barcodes must begin with 1.`);
      }
      // Don't give popup alert if it's just the wrong length, to avoid
      // excessive alerts
    }
  }, [data.original.tray]);

  useEffect(() => {
    // Don't try to verify barcodes if the item field is empty
    if (debouncedLeftPaneItems && debouncedLeftPaneItems.length > 0) {
      const allItems = debouncedLeftPaneItems.split('\n').filter(Boolean);
      // When checking live, don't check the last item if it isn't 15
      // characters long, because it's probably not a complete barcode
      const lastItem = allItems[allItems.length - 1];
      const itemsToVerify = lastItem.length < 15 ? allItems.slice(0, -1) : allItems;
      console.log(lastItem.length);
      console.log(itemsToVerify);
      verifyItemsLive(itemsToVerify);
    }
  }, [debouncedLeftPaneItems]);


  useEffect(() => {
    // Play sound if there are duplicate barcodes in either pane
    const allItemsOriginal = debouncedLeftPaneItems.split('\n').filter(Boolean);
    const allItemsVerify = debouncedMiddlePaneItems.split('\n').filter(Boolean);
    // Show error if duplicate barcode exists within the same input field
    if ((new Set(allItemsOriginal)).size !== allItemsOriginal.length || (new Set(allItemsVerify)).size !== allItemsVerify.length) {
      // Play error message but don't give popup alert because we are
      // already showing the duplicate barcode error on screen
      errorAudio.play();
    }
  }, [debouncedLeftPaneItems, debouncedMiddlePaneItems]);

  const handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  }

  // Anytime the DOM is updated, update local storage
  useEffect(() => {
    const getLocalItems = async () => {
      const local = await handleLocalStorage('tray') || [];
      dispatch({ type: 'UPDATE_STAGED', verified: local});
    };
    getLocalItems();
  });

  // The inspect functions take place when the original form is submitted

  // Collections aren't inspected live
  const inspectCollection = () => {
    const { original } = data;
    if (!original.collection) {
      failure(`You must select a collection.`);
      return false;
    } else {
      return true;
    }
  };

  // When inspecting trays upon submission, we want to give a popup for
  // tray length, plus the ordinary live checking
  const inspectTray = (tray) => {
    const { trayLength } = data;
    if (!trayStructure.test(tray)) {
      failure(`Tray barcode must be ${trayLength} characters long and begin with 1.`);
      return false;
    }
    else {
      if (data.trayGood.includes(tray)) {
        return true;
      }
      else if (data.trayBadStaged.includes(tray)) {
        failure(`Tray barcode ${tray} is already staged.`);
        return false;
      }
      else if (data.trayBadSystem.includes(tray)) {
        failure(`Tray barcode ${tray} is already in the system.`);
        return false;
      }
      else if (data.trayCheckStarted.includes(tray)) {
        warning(`The tray barcode is currently being verified. Please try again in a few seconds.`);
        return false;
      }
      else {
        console.log('Unknown error occurred');
        failure(`An unknown error occurred.`);
        return false;
      }
    }
  };

  const inspectItems = (barcodes) => {
    if (!barcodes || barcodes.length === 0) {
      failure(`You cannot add an empty tray.`);
      return false;
    }
    // If there are duplicate barcodes, don't allow the form to submit
    const itemsAsArray = barcodes.split('\n').filter(Boolean);
    if ((new Set(itemsAsArray)).size !== itemsAsArray.length) {
      failure(`You cannot add a tray with duplicate barcodes.`);
      return false;
    }
    const verifiedAllItems = verifyItemsOnSubmit(itemsAsArray);
    return verifiedAllItems;
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

  const locateDuplicates = barcodesAsString => {
    const barcodes = barcodesAsString.split('\n').filter(Boolean);
    const duplicates = [];
    barcodes.forEach((barcode, index) => {
      if (barcodes.indexOf(barcode) !== index) {
        duplicates.push(barcode);
      }
    });
    return duplicates.join(', ');
  };

  const badBarcodes = barcodesAsString => {
    const barcodes = barcodesAsString.split('\n').filter(Boolean);
    const badBarcodes = [];
    barcodes.forEach(barcode => {
      if (data.itemAlreadyAlerted.includes(barcode)) {
        if (!badBarcodes.includes(barcode)) {
          badBarcodes.push(barcode);
        }
      }
    });
    return badBarcodes.join('\n');
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

  const handleOriginalSubmit = (e) => {
    e.preventDefault();
    // If the user is clicking verify, we want to show them alerts a
    // second time if necessary so they know what the exact problem is
    dispatch({ type: 'CLEAR_ALREADY_ALERTED' });
    const original = data.original;
    // Add a newline character to the bottom of the list of barcodes if necessary
    if (original.barcodes === '' || original.barcodes.slice(-1) !== '\n') {
      original['barcodes'] = original['barcodes'] + '\n';
      dispatch({ type: 'ADD_ORIGINAL', original: original});
    }
    const timer = setTimeout(() => {
      const collectionPassedInspection = inspectCollection();
      const trayPassedInspection = inspectTray(data.original.tray);
      const itemsPassedInspection = inspectItems(data.original.barcodes);
      if (collectionPassedInspection && trayPassedInspection && itemsPassedInspection) {
        dispatch({ type: 'CHANGE_FORM', form: 'verify'});
        dispatch({ type: 'ADD_VERIFY', verify: {tray: '', barcodes: ''} });
      }
    }, 500);
    return () => clearTimeout(timer);
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();

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

    const originalItemsAsArray = data.original.barcodes ? data.original.barcodes.split('\n').filter(Boolean) : [];
    const verifyItemsAsArray = data.verify.barcodes ? data.verify.barcodes.split('\n').filter(Boolean) : [];
    const mismatches = findMismatches(originalItemsAsArray, verifyItemsAsArray);

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
                  clearOriginal={clearOriginal}
                  form={data.form}
                  disabled={data.form === 'verify'}
                  disabledSubmit={!trayStructure.test(data.original.tray) || data.original.barcodes.length === 0 || locateDuplicates(data.original.barcodes).length > 0}
                  disabledClear={data.original.tray.length === 0 && data.original.barcodes.length === 0}
                  trayStructure={trayStructure}
                  locateDuplicates={locateDuplicates}
                  badBarcodes={badBarcodes}
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
                goBackToOriginal={goBackToOriginal}
                disabled={data.form === 'original'}
                disabledSubmit={!trayStructure.test(data.verify.tray) || data.verify.barcodes.length === 0 || locateDuplicates(data.verify.barcodes).length > 0}
                trayStructure={trayStructure}
                locateDuplicates={locateDuplicates}
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
            ? <Badge color="success">{props.original.tray.length}</Badge>
            : props.original.tray.length === 0
              ? <Badge>{props.original.tray.length}</Badge>
              : (<><Badge color={props.TRAY_BARCODE_LENGTH === props.original.tray.length ? "warning" : "danger"}>{props.original.tray.length}</Badge> <span className='text-danger'>✘</span></>
              )
          }
        </Label>
        <Input
          type="text"
          name="tray"
          placeholder="Tray barcode"
          value={props.original.tray}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault();
            return false;
          }}
          onKeyDown={props.handleEnter}
          disabled={props.disabled}
          autoFocus={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="barcodes">Items</Label>{ ' ' }
        { (new Set(props.original.barcodes.split('\n').filter(Boolean))).size !== props.original.barcodes.split('\n').filter(Boolean).length
          ?
          <>
            <Badge
              color={(new Set(props.original.barcodes.split('\n').filter(Boolean))).size !== props.original.barcodes.split('\n').filter(Boolean).length ? "danger" : "secondary"}
            >
              {props.original.barcodes.split('\n').filter(Boolean).length}
            </Badge>
            { ' ' }
            <span className="text-danger">duplicate: {props.locateDuplicates(props.original.barcodes)}</span>
          </>
          : <Badge>{props.original.barcodes.split('\n').filter(Boolean).length}</Badge>
        }
        <Input
          type="textarea"
          rows="10"
          name="barcodes"
          value={props.original.barcodes}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            e.preventDefault();
            return false;
          }}
          disabled={props.disabled}
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
    { props.badBarcodes(props.original.barcodes) ?
      <div className="text-danger" style={{whiteSpace: 'pre', paddingTop: '15px'}}>
        { props.badBarcodes(props.original.barcodes) }
      </div>
      : null
    }
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
            ? <Badge color="success">{props.verify.tray.length}</Badge>
            : props.verify.tray.length === 0
              ? <Badge>{props.verify.tray.length}</Badge>
              : (<><Badge color={props.TRAY_BARCODE_LENGTH === props.verify.tray.length ? "warning" : "danger"}>{props.verify.tray.length}</Badge> <span className='text-danger'>✘</span></>
              )
          }
      </Label>
      <Input
        type="text"
        name="tray"
        placeholder={ props.disabled ? "" : "Tray barcode" }
        value={props.verify.tray}
        onChange={(e) => props.handleVerifyOnChange(e)}
        onPaste={(e)=>{
          e.preventDefault();
          return false;
        }}
        onKeyDown={props.handleEnter}
        disabled={props.disabled}
      />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Items</Label>{ ' ' }
        { (new Set(props.verify.barcodes.split('\n').filter(Boolean))).size !== props.verify.barcodes.split('\n').filter(Boolean).length
          ?
          <>
            <Badge
              color={(new Set(props.verify.barcodes.split('\n').filter(Boolean))).size !== props.verify.barcodes.split('\n').filter(Boolean).length ? "danger" : "secondary"}
            >
              {props.verify.barcodes.split('\n').filter(Boolean).length}
            </Badge>
            { ' ' }
            <span className="text-danger">duplicate: {props.locateDuplicates(props.verify.barcodes)}</span>
          </>
          : <Badge>{props.verify.barcodes.split('\n').filter(Boolean).length}</Badge>
        }
      <Input
        type="textarea"
        rows="10"
        name="barcodes"
        value={props.verify.barcodes}
        onChange={(e) => props.handleVerifyOnChange(e)}
        onPaste={(e)=>{
          e.preventDefault();
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
                  props.removeItems([props.data[tray].barcode]);
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
