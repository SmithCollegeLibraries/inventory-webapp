import React, { useCallback, useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, warning, failure } from '../components/toastAlerts';

// Put default collection for each user separately
const COLLECTION_PLACEHOLDER = '--- Select collection ---';


const NewTray = () => {
  const initialState = {
    form: 'original',  // Which form is currently being displayed (original or verify)
    original: {
      collection: '',
      tray: '',
      barcodes: ''
    },
    verify: {
      tray: '',
      barcodes: ''
    },
    verified: [],  // List of trays that have been verified and staged
    collections: [],
    defaultCollection: '',
    settings: {},

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

    // Containers for the error items we actually display
    duplicateOriginalItems: "",
    duplicateVerifyItems: "",
    errorItems: "",
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
      case 'ADD_DEFAULT_COLLECTION':
        return {
          ...state,
          original: {
            ...state.original,
            collection: action.collection,
          },
        };
      case 'UPDATE_STAGED':
        return {
          ...state,
          verified: action.verified,
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
          itemUsedCheckStarted: [...state.itemUsedCheckStarted, ...action.items],
        };
      case 'ITEM_USED_CHECK_CLEAR':
        return {
          ...state,
          itemUsedCheckStarted: [],
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
          itemFolioCheckStarted: [...state.itemFolioCheckStarted, ...action.items],
        };
      case 'ITEM_FOLIO_CHECK_CLEAR':
        return {
          ...state,
          itemFolioCheckStarted: [],
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
      case 'UPDATE_DUPLICATES':
        return {
          ...state,
          duplicateOriginalItems: action.duplicateOriginalItems,
          duplicateVerifyItems: action.duplicateVerifyItems,
        };
      case 'UPDATE_BAD_BARCODES':
        return {
          ...state,
          errorItems: action.errorItems,
        };
      case 'CHANGE_FORM':
        return {
          ...state,
          form: action.form,
        };
      case 'CLEAR_CHECKS':
        return {
          ...state,
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
          },
          // Don't add 'verified' here! That should not be cleared on reset!

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

          // Containers for the error items we actually display
          duplicateOriginalItems: "",
          duplicateVerifyItems: "",
          errorItems: "",
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedLeftPaneItems = useDebounce(data.original.barcodes);
  const debouncedMiddlePaneItems = useDebounce(data.verify.barcodes);


  // Live verification functions, which also get called again on submission
  const failureIfNew = useCallback((barcode, message) => {
    // Only alert if the barcode is not already in the list of alerted barcodes
    // This prevents the same barcode from being alerted multiple times
    // if the user doesn't clear the list of barcodes
    if (!data.itemAlreadyAlerted.includes(barcode)) {
      failure(message);
      dispatch({ type: 'ITEM_ALREADY_ALERTED', item: barcode });
    }
    else {
      const errorPath = process.env.PUBLIC_URL + "/error.mp3";;
      const errorAudio = new Audio(errorPath);
      errorAudio.play();
    }
  }, [data.itemAlreadyAlerted]);

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
        var itemRegex = new RegExp(data.settings.itemStructure);
        if (!itemRegex.test(barcode)) {
          failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes are 15 characters long and begin with 31.`);
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

  // Get settings from database on load
  useEffect(() => {
    const getSettings = async () => {
      const settings = await Load.getAllSettings();
      dispatch({ type: 'UPDATE_SETTINGS', settings: settings});
    };
    getSettings();
  }, []);

  // Get current user's default collection
  useEffect(() => {
    const getDefaultCollection = async () => {
      const collection = await Load.getDefaultCollection();
      // Don't override a selected collection -- just an empty default;
      // also make sure that there is in fact an active default collection
      // for the current user
      if (data.original.collection === '' && collection) {
        dispatch({ type: 'ADD_DEFAULT_COLLECTION', collection: collection.name});
      }
    };
    getDefaultCollection();
  }, []);

  // Get list of active collections from database on load
  useEffect(() => {
    const getCollections = async () => {
      const collections = await Load.getAllCollections();
      dispatch({ type: 'UPDATE_COLLECTIONS', collections: collections});
    };
    getCollections();
  }, []);

  // Now the actual hooks that implement the live checks

  useEffect(() => {
    const trayRegex = new RegExp(data.settings.trayStructure);
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

    // Don't bother doing the live verification if it's not even the
    // correct length or doesn't begin with 1. (We're already showing the
    // user that it's incorrect with the badge, so no need to give a
    // popup alert.)
    if (trayRegex.test(data.original.tray)) {
      if (data.trayCheckStarted.includes(data.original.tray)) {
        // Do nothing if the tray is already being checked
      }
      else {
        dispatch({ type: 'TRAY_CHECK_STARTED', tray: data.original.tray });
        verifyTrayLive(data.original.tray);
      }
    }
    else {
      if (data.original.tray.length === data.settings.trayBarcodeLength) {
        failure(`Valid tray barcodes must begin with 1.`);
      }
      // Don't give popup alert if it's just the wrong length, to avoid
      // excessive alerts
    }
  }, [data.original.tray]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const itemRegex = new RegExp(data.settings.itemStructure);
    const verifyItemsLive = async (barcodes) => {

      const verifyItemsFree = async (barcodes) => {
        // Tell the system that we have started checking these items
        dispatch({ type: 'ITEM_USED_CHECK_STARTED', items: barcodes });
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
        for (const barcode of barcodes) {
          if (!resultBarcodes.includes(barcode)) {
            dispatch({ type: 'ITEM_USED_GOOD', item: barcode });
          }
        }
        fullResults.forEach(item => {
          if (item["tray"]) {
            failureIfNew(item["barcode"], `Item ${item["barcode"]} is already in tray ${item["tray"]["barcode"]}.`);
            dispatch({ type: 'ITEM_USED_BAD_SYSTEM', item: item["barcode"] });
            return false;
          }
          else {
            failureIfNew(item["barcode"], `Item ${item["barcode"]} is already in the system (untrayed).`);
            dispatch({ type: 'ITEM_USED_BAD_SYSTEM', item: item["barcode"] });
            return false;
          }
        });
        dispatch({ type: 'ITEM_USED_CHECK_CLEAR' });
        return true;
      };

      const verifyFolioRecord = async (barcodes) => {
        dispatch({ type: 'ITEM_FOLIO_CHECK_STARTED', items: barcodes });
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
        // After getting the results, clear that we've started checking
        // so that we don't get a "perpetual pending" error
        dispatch({ type: 'ITEM_FOLIO_CHECK_CLEAR' });
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
        else if (!itemRegex.test(barcode)) {
          failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes begin with 31 and are 15 characters long.`);
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

      let allItemsFree = verifyItemsFree(barcodesToLookupInSystem);
      let allItemsInFolio = verifyFolioRecord(barcodesToLookupInFolio);
      if (await allItemsFree !== true) {
        return false;
      }
      if (await allItemsInFolio !== true) {
        return false;
      }

      // If we've made it this far, all barcodes are valid
      return !brokenBarcodes;
    };

    // Don't try to verify barcodes if the item field is empty
    if (debouncedLeftPaneItems && debouncedLeftPaneItems.length > 0) {
      const allItems = debouncedLeftPaneItems.split('\n').filter(Boolean);
      // When checking live, don't check the last item if it isn't 15
      // characters long, because it's probably not a complete barcode
      const lastItem = allItems ? allItems[allItems.length - 1] : '';
      const itemsToVerify = lastItem ? (lastItem.length < 15 ? allItems.slice(0, -1) : allItems) : [];
      if (itemsToVerify) {
        verifyItemsLive(itemsToVerify);
      }
    }
  }, [debouncedLeftPaneItems]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    const locateDuplicates = barcodes => {
      const duplicates = [];
      barcodes.forEach((barcode, index) => {
        if (barcodes.indexOf(barcode) !== index) {
          duplicates.push(barcode);
        }
      });
      return duplicates.join(', ');
    };

    // Play sound if there are duplicate barcodes in either pane
    const allItemsOriginal = debouncedLeftPaneItems.split('\n').filter(Boolean);
    const allItemsVerify = debouncedMiddlePaneItems.split('\n').filter(Boolean);
    const originalDuplicates = locateDuplicates(allItemsOriginal);
    const verifyDuplicates = locateDuplicates(allItemsVerify);
    if (originalDuplicates !== data.duplicateOriginalItems || verifyDuplicates !== data.duplicateVerifyItems) {
      dispatch({ type: 'UPDATE_DUPLICATES', duplicateOriginalItems: originalDuplicates, duplicateVerifyItems: verifyDuplicates });
    }
    // Show error if duplicate barcode exists within the same input field
    if (originalDuplicates.length > 0 || verifyDuplicates.length > 0) {
      // Play error message but don't give popup alert because we are
      // already showing the duplicate barcode error on screen
      const errorPath = process.env.PUBLIC_URL + "/error.mp3";;
      const errorAudio = new Audio(errorPath);
      errorAudio.play();
    }
  }, [debouncedLeftPaneItems, debouncedMiddlePaneItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // For handling bad barcode items in the original pane (these are things
  // that aren't duplicates, but intrinsically should not be added)
  useEffect(() => {
    const barcodes = debouncedLeftPaneItems.split('\n').filter(Boolean);
    let errorItems = [];
    barcodes.forEach(barcode => {
      if (data.itemAlreadyAlerted.includes(barcode)) {
        if (!errorItems.includes(barcode)) {
          errorItems.push(barcode);
        }
      }
    });
    const errorItemsAsString = errorItems.join('\n');
    if (errorItemsAsString !== data.errorItems) {
      dispatch({ type: 'UPDATE_BAD_BARCODES', errorItems: errorItemsAsString });
    }
  }, [debouncedLeftPaneItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // On load, check local storage for any staged items
  useEffect(() => {
    updateStagedFromLocalStorage();
  }, []);

  const updateStagedFromLocalStorage = () => {
    let localTrays = [];
    // Narrow in only on things relevant to the new tray form
    Object.keys(localStorage).forEach(function(key, index) {
      if (key.includes('newtray-')) {
        try {
          localTrays.push(JSON.parse(localStorage[key]));
        }
        catch (e) {
          console.error(e);
        }
      }
    });
    dispatch({type: 'UPDATE_STAGED', verified: localTrays});
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
    // Automatically remove non-numeric characters from tray and items
    // fields; this is important because the actual barcodes for trays are
    // prefixed with SM, which the barcode scanners will add to the input
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g,'');
    }
    else if (e.target.name === 'collection') {
      value = e.target.value === COLLECTION_PLACEHOLDER ? '' : e.target.value;
    }
    const original = data.original;
    original[e.target.name] = value;
    dispatch({ type: 'ADD_ORIGINAL', original: original});
  }

  const handleVerifyOnChange = e => {
    e.preventDefault();
    const verify = data.verify;
    let value = e.target.value;
    // Automatically remove non-numeric characters from tray and items
    // fields; this is important because the actual barcodes for trays are
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

  const handleOriginalSubmit = (e) => {
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
      if (!trayRegex.test(tray)) {
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
      addTrayToStaged({
        barcode: data.verify.tray,
        collection: data.original.collection,
        items: originalItemsAsArray
      });
      updateStagedFromLocalStorage();
      dispatch({ type: "RESET" });
    }
  };

  // Staged items area

  const handleProcessTrays = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      for (const tray of Object.keys(data.verified).map(key => data.verified[key])) {
        console.log(tray);
        const response = await Load.newTray(tray);
        console.log(response);
        if (response === tray.barcode) {
          success(`Tray ${tray.barcode} successfully added`);
          removeTrayFromStaged(tray.barcode);
        }
        else {
          const errorPath = process.env.PUBLIC_URL + "/error.mp3";;
          const errorAudio = new Audio(errorPath);
          errorAudio.play();
        }
      }
    }
    else {
      failure("You must be connected to the internet to process trays. Please check your internet connection.");
    }
  };

  const addTrayToStaged = (trayInfo) => {
    localStorage['newtray-' + trayInfo.barcode] = JSON.stringify(trayInfo);
  };

  const removeTrayFromStaged = (trayBarcode) => {
    delete localStorage['newtray-' + trayBarcode];
    updateStagedFromLocalStorage();
  };

  const clearStagedTrays = () => {
    if (window.confirm('Are you sure you want to clear all staged trays? This action cannot be undone.')) {
      for (const tray of Object.keys(localStorage).filter(key => key.includes('newtray-'))) {
        delete localStorage[tray];
      }
      updateStagedFromLocalStorage();
    }
  };

  const trayRegex = new RegExp(data.settings.trayStructure);

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <TrayFormOriginal
                  handleEnter={handleEnter}
                  collections={data.collections}
                  trayLength={data.trayLength}
                  original={data.original}
                  handleOriginalOnChange={handleOriginalOnChange}
                  handleOriginalSubmit={handleOriginalSubmit}
                  clearOriginal={clearOriginal}
                  form={data.form}
                  disabled={data.form === 'verify'}
                  disabledSubmit={!trayRegex.test(data.original.tray) || data.original.barcodes.length === 0 || data.duplicateOriginalItems.length > 0}
                  disabledClear={data.original.tray.length === 0 && data.original.barcodes.length === 0}
                  trayRegex={trayRegex}
                  duplicateOriginalItems={data.duplicateOriginalItems}
                  errorItems={data.errorItems}
                  trayBarcodeLength={data.settings.trayBarcodeLength}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card>
              <CardBody>
              <TrayFormVerify
                handleEnter={handleEnter}
                trayLength={data.trayLength}
                original={data.original}
                verify={data.verify}
                handleVerifyOnChange={handleVerifyOnChange}
                handleVerifySubmit={handleVerifySubmit}
                goBackToOriginal={goBackToOriginal}
                disabled={data.form === 'original'}
                disabledSubmit={!trayRegex.test(data.verify.tray) || data.verify.barcodes.length === 0 || data.duplicateVerifyItems.length > 0}
                trayRegex={trayRegex}
                duplicateVerifyItems={data.duplicateVerifyItems}
                trayBarcodeLength={data.settings.trayBarcodeLength}
              />
              </CardBody>
            </Card>
          </Col>
          <Col>
            <Display
              data={data.verified}
              removeTrayFromStaged={removeTrayFromStaged}
            />
            { Object.keys(data.verified).map(items => items).length
              ? <>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleProcessTrays(e)} color="primary">Process all</Button>
                <Button style={{marginRight: '10px'}} color="danger" onClick={(e) => clearStagedTrays(e)}>Delete all</Button>
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
      <FormGroup>
        <Label for="collections">Collection</Label>
        <Input type="select" value={props.original.collection} onChange={(e) => props.handleOriginalOnChange(e)} name="collection" disabled={props.disabled}>
          <option>{ console.log(props.collections) || COLLECTION_PLACEHOLDER }</option>
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
          { props.trayRegex.test(props.original.tray)
            ? <Badge color="success">{props.original.tray.length}</Badge>
            : props.original.tray.length === 0
              ? <Badge>{props.original.tray.length}</Badge>
              : (<><Badge color={props.trayBarcodeLength === props.original.tray.length ? "warning" : "danger"}>{props.original.tray.length}</Badge> <span className='text-danger'>✘</span></>
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
            if (!process.env.REACT_APP_ROOT.includes("-dev")) {
              e.preventDefault();
              return false;
            }
          }}
          onKeyDown={(e) => props.handleEnter(e)}
          disabled={props.disabled}
          autoFocus={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="barcodes">Items</Label>{ ' ' }
        { props.duplicateOriginalItems && props.duplicateOriginalItems.length > 0
          ?
          <>
            <Badge color="danger">
              {props.original.barcodes.split('\n').filter(Boolean).length}
            </Badge>
            { ' ' }
            <span className="text-danger">duplicate: {props.duplicateOriginalItems}</span>
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
            if (!process.env.REACT_APP_ROOT.includes("-dev")) {
              e.preventDefault();
              return false;
            }
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
    { props.errorItems && props.errorItems.length > 0 ?
      <div className="text-danger" style={{whiteSpace: 'pre', paddingTop: '15px'}}>
        { props.errorItems }
      </div>
      : null
    }
  </div>
);

const TrayFormVerify = props => (
  <Form autoComplete="off">
    <FormGroup>
      <Label for="collections">Collection</Label>
      <Input type="text" value={ props.original.collection === COLLECTION_PLACEHOLDER ? "" : props.original.collection } onChange={(e) => props.handleVerifyOnChange(e)} name="collection" disabled={true} />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Tray{ ' ' }
          { props.trayRegex.test(props.verify.tray) && props.original.tray === props.verify.tray
            ? <Badge color="success">{props.verify.tray.length}</Badge>
            : props.verify.tray.length === 0
              ? <Badge>{props.verify.tray.length}</Badge>
              : (<><Badge color={props.trayBarcodeLength === props.verify.tray.length ? "warning" : "danger"}>{props.verify.tray.length}</Badge> <span className='text-danger'>✘</span></>
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
          if (!process.env.REACT_APP_ROOT.includes("-dev")) {
            e.preventDefault();
            return false;
          }
        }}
        onKeyDown={(e) => props.handleEnter(e)}
        disabled={props.disabled}
      />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Items</Label>{ ' ' }
        { props.duplicateVerifyItems && props.duplicateVerifyItems.length > 0
          ?
          <>
            <Badge color="danger" >
              {props.verify.barcodes.split('\n').filter(Boolean).length}
            </Badge>
            { ' ' }
            <span className="text-danger">duplicate: {props.duplicateVerifyItems}</span>
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
          if (!process.env.REACT_APP_ROOT.includes("-dev")) {
            e.preventDefault();
            return false;
          }
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
            <dt className="col-sm-3">Collection</dt>
            <dd className="col-sm-9">
              {props.data[tray].collection}
            </dd>
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeTrayFromStaged(props.data[tray].barcode);
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
