import React, { useCallback, useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
import { itemError, trayError } from '../util/helpers';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, failure } from '../components/toastAlerts';

// Put default collection for each user separately
const COLLECTION_PLACEHOLDER = '--- Select collection ---';


const AddReturn = () => {
  const initialState = {
    form: 'original',  // Which form is currently being displayed (original or verify)
    original: {
      collection: '',
      item: '',
      tray: '',
    },
    trayDetails: {},
    verify: {
      item: '',
      tray: '',
    },
    verified: [],  // List of things that have been verified and staged
    collections: [],
    defaultCollection: '',
    defaultCollectionMessage: false,
    settings: {},

    // Containers for all the possible states of verifying trays and items
    itemFolioBad: [],
    itemFolioGood: [],
    itemAlreadyAlerted: [],
    collectionValidatedAgainstFolio: true,

    // The following two keep track of items and trays that have been
    // looked up in the database
    itemTraysInSystem: {},
    itemStatusesInSystem: {},
    trayInformation: {},
  };

  const trayReducer = (state, action) => {
    switch (action.type) {
      case 'ADD_ORIGINAL':
        return {
          ...state,
          original: action.original,
        };
      case 'UPDATE_COLLECTION':
        return {
          ...state,
          original: {
            ...state.original,
            collection: action.collection,
          },
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
      case 'DEFAULT_COLLECTION_MESSAGE':
        return {
          ...state,
          defaultCollectionMessage: action.value,
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
      case 'ITEM_TRAYS_IN_SYSTEM':
        state.itemTraysInSystem[action.item] = action.tray;
        return state;
      case 'ITEM_STATUSES_IN_SYSTEM':
        state.itemStatusesInSystem[action.item] = action.status;
        return state;
      case 'TRAY_INFORMATION':
        state.trayInformation[action.tray] = {
          currentCount: action.currentCount,
          fullCount: action.fullCount,
        };
        return state;
      case 'INCREMENT_TRAY_COUNT':
        if (state.trayInformation[action.trayBarcode]) {
          state.trayInformation[action.trayBarcode].currentCount += 1;
        }
        return state;
      case 'DECREMENT_TRAY_COUNT':
        if (state.trayInformation[action.trayBarcode]) {
          state.trayInformation[action.trayBarcode].currentCount -= 1;
        }
        return state;
      case 'UPDATE_COLLECTIONS':
        return {
          ...state,
          collections: action.collections,
        };
      case 'CHANGE_FORM':
        return {
          ...state,
          form: action.form,
        };
      case 'CHANGE_COLLECTION_VALIDATION':
        return {
          ...state,
          collectionValidatedAgainstFolio: action.value,
        };
      case 'RESET':
        return {
          ...state,
          form: "original",
          original: {
            collection: state.original.collection,
            item: '',
            tray: '',
          },
          verify: {
            item: '',
            tray: '',
          },
          trayInformation: {},
          // Don't add 'verified' here! That should not be cleared on reset!
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedLeftPaneItem = useDebounce(data.original.item);
  const debouncedLeftPaneTray = useDebounce(data.original.tray);

  const performLastCheck = (barcode) => {
    const handleLastCheck = (barcode) => {
      var itemTrayMessage = "";
      var itemStatusMessage = "";
      if (data.itemTraysInSystem[barcode] && data.itemTraysInSystem[barcode] !== data.original.tray) {
        itemTrayMessage = "The tray given does not match the item's current tray. ";
      }
      if (data.itemStatusesInSystem[barcode] && data.itemStatusesInSystem[barcode] !== "Circulating") {
        if (itemTrayMessage) {
          itemStatusMessage = "Also, this item is not currently marked as circulating. ";
        }
        else {
          itemStatusMessage = "This item is not currently marked as circulating. ";
        }
      }

      if (itemTrayMessage || itemStatusMessage) {
        if (!window.confirm(itemTrayMessage + itemStatusMessage + "Are you sure you want to continue?")) {
          dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
          dispatch({ type: 'CHANGE_FORM', form: 'original'});
        }
      }
    }
    const timer = setTimeout(() => {
      return handleLastCheck(barcode);
    }, 800);
    return () => clearTimeout(timer);
  }

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
      const errorPath = process.env.PUBLIC_URL + "/error.mp3";
      const errorAudio = new Audio(errorPath);
      errorAudio.play();
    }
  }, [data.itemAlreadyAlerted]);

  const verifyItemOnSubmit = (barcode, collection) => {
    // For each barcode, check against the system and then also make sure
    // that it's checked against FOLIO
    var itemRegex = new RegExp(data.settings.itemStructure);
    if (!itemRegex.test(barcode)) {
      return false;
    }
    else if (!verifyItemUnstaged(barcode)) {
      return false;
    }
    else {
      // While this doesn't catch items that have been looked up in FOLIO
      // and haven't yet thrown an error, we will catch those when the
      // Verify screen has been submitted. We don't want to hold up the
      // process -- otherwise the user will get a warning on every single
      // submission that verification is still in process.
      performLastCheck(barcode);
      return true;
    }
  }

  const verifyItemUnstaged = (barcode) => {
    // First see whether it already exists in staged trays
    const arrayOfStagedItems = Object.keys(data.verified).map(index => data.verified[index].barcode);
    const stagedItems = [].concat.apply([], arrayOfStagedItems);
    if (stagedItems.includes(barcode)) {
      failure(`Item ${barcode} is already staged`);
      return false;
    }
    return true;
  };

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
      if (collection) {
        // Don't override a selected collection -- just an empty default;
        // also make sure that there is in fact an active default collection
        // for the current user
        if (!data.original.collection) {
          dispatch({ type: 'ADD_DEFAULT_COLLECTION', collection: collection.name});
        }
      }
      else {
        dispatch({ type: 'DEFAULT_COLLECTION_MESSAGE', value: true});
      }
    };
    getDefaultCollection();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get list of active collections from database on load
  useEffect(() => {
    const getCollections = async () => {
      const collections = await Load.getAllCollections();
      dispatch({ type: 'UPDATE_COLLECTIONS', collections: collections});
    };
    getCollections();
  }, []);

  // Notice when the collection is changed, and update whether we validate
  // against FOLIO if necessary.
  useEffect(() => {
    const getCollectionInfo = (collection) => {
      if (collection === '') {
        return {};
      }
      else {
        return data.collections.find(c => c.name === collection);
      }
    };
    const collectionInfo = getCollectionInfo(data.original.collection);
    if (collectionInfo) {
      dispatch({
        type: 'CHANGE_COLLECTION_VALIDATION',
        value: data.original.collection ? getCollectionInfo(data.original.collection).folio_validated : true
      });
    }
  }, [data.original.collection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Now the actual hooks that implement the live checks

  useEffect(() => {
    const itemRegex = new RegExp(data.settings.itemStructure);
    const verifyItemLive = async (barcode) => {

      const checkItemInSystem = async (barcode) => {
        // If the item is already in the database, make sure it's not marked
        // as belonging to a different collection
        if (navigator.onLine) {
          const databaseResults = await Load.itemSearch({"barcodes": [barcode]});
          if (databaseResults.length > 0) {
            var result = databaseResults[0];
            dispatch({ type: 'ITEM_TRAYS_IN_SYSTEM', item: barcode, tray: result.tray ? result.tray.barcode : null });
            dispatch({ type: 'ITEM_STATUSES_IN_SYSTEM', item: barcode, status: result.status });
          }
          else {
            dispatch({ type: 'ITEM_TRAYS_IN_SYSTEM', item: barcode, tray: null });
            dispatch({ type: 'ITEM_STATUSES_IN_SYSTEM', item: barcode, status: null });
          }
        }
        // If we're not online, acknowledge that we tried to check this item
        // and allow it to pass the test. Any anomalies will be flagged when
        // actually added to the database.
        else {
          dispatch({ type: 'ITEM_TRAYS_IN_SYSTEM', item: barcode, tray: null });
          dispatch({ type: 'ITEM_STATUSES_IN_SYSTEM', item: barcode, status: null });
        }
      };

      // Look up the item in the database, but don't necessarily check
      // against the tray and status or give any warnings yet
      checkItemInSystem(barcode);

      // Gives an alert to the user if a barcode has been entered that
      // doesn't exist in FOLIO. Only shows this warning once per barcode.
      // Once checked, barcodes are saved in state so that multiple API
      // calls aren't made to the FOLIO server every time the input field
      // is changed.

      let brokenBarcode = null;

      if (barcode === '') {
        // Don't verify empty "barcodes"
      }
      else if (!itemRegex.test(barcode)) {
        failure(itemError(barcode));
        brokenBarcode = barcode;
      }
      else if (!verifyItemUnstaged(barcode)) {
        // Already giving an alert when checking
        brokenBarcode = barcode;
      }

      // If we've made it this far, all barcodes are valid
      return !brokenBarcode;
    };

    // When checking live, don't check if the item isn't at least 15
    // characters long, because it's probably not a complete barcode
    if (debouncedLeftPaneItem && debouncedLeftPaneItem.length === 15) {
      verifyItemLive(debouncedLeftPaneItem);
    }
  }, [debouncedLeftPaneItem]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const verifyTrayLive = async (trayBarcode) => {
      const checkTrayInSystem = async (barcode) => {
        if (navigator.onLine) {
          // Make sure that the tray is already in the system
          const result = await Load.getTray({"barcode": [barcode]});
          // Only fetch the tray information once, because any future items
          // added to the tray in this session will update the count
          if (result && !data.trayInformation[barcode]) {
            dispatch({
              type: 'TRAY_INFORMATION',
              tray: barcode,
              items: result.items,
              currentCount: result.items.length,
              fullCount: result.full_count,
            });
          }
        }
        // If we're not online, acknowledge that we tried to check this item
        // and allow it to pass the test. Any anomalies will be flagged when
        // actually added to the database.
        else {
          dispatch({ type: 'ITEM_TRAYS_IN_SYSTEM', item: barcode, tray: null });
          dispatch({ type: 'ITEM_STATUSES_IN_SYSTEM', item: barcode, status: null });
        }
      }

      // Gives an alert to the user if a barcode has been entered that
      // doesn't match the tray structure
      if (!trayRegex.test(trayBarcode)) {
        failure(trayError(trayBarcode));
        return false;
      }
      // Start the tray check against the database; the data should come
      // in by the time the original pane is submitted
      checkTrayInSystem(trayBarcode);
    }

    if (debouncedLeftPaneTray && debouncedLeftPaneTray.length >= data.settings.trayBarcodeLength) {
      verifyTrayLive(debouncedLeftPaneTray);
    }
  }, [debouncedLeftPaneTray]); // eslint-disable-line react-hooks/exhaustive-deps

  // On load, check local storage for any staged items
  useEffect(() => {
    updateStagedFromLocalStorage();
  }, []);

  const updateStagedFromLocalStorage = () => {
    let localItems = [];
    // Narrow in only on things relevant to the new tray form
    Object.keys(localStorage).forEach(function(key, index) {
      if (key.includes('addreturnitem-')) {
        try {
          localItems.push(JSON.parse(localStorage[key]));
        }
        catch (e) {
          console.error(e);
        }
      }
    });
    dispatch({type: 'UPDATE_STAGED', verified: localItems});
  }

  // Handling interactions with the form

  const verifyFolioRecord = async (barcode) => {
    dispatch({ type: 'ITEM_FOLIO_CHECK_STARTED', item: barcode });
    if (barcode.length > 0) {
      const itemInFolio = await Load.itemInFolio(barcode);
      if (itemInFolio) {
        dispatch({ type: 'ITEM_FOLIO_GOOD', item: barcode });
      }
      else if (data.collectionValidatedAgainstFolio) {
        failureIfNew(barcode, `Unable to locate FOLIO record for ${barcode}.`);
        dispatch({ type: 'ITEM_FOLIO_BAD', item: barcode });
        const timer = setTimeout(() => {
          dispatch({ type: 'CHANGE_FORM', form: 'original'});
          dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
        }, 200);
        return () => clearTimeout(timer);
      }
    }
    // After getting the results, clear that we've started checking
    // so that we don't get a "perpetual pending" error
    dispatch({ type: 'ITEM_FOLIO_CHECK_CLEAR' });
  };

  const handleEnter = (e) => {
    if (e.keyCode === 13) {
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      form.elements[index + 1].focus();
      e.preventDefault();
    }
  };

  const handleEnterOriginalSubmit = e => {
    if (e.keyCode === 13) {
      e.preventDefault();
      handleOriginalSubmit(e);
    }
  };

  const handleEnterVerifySubmit = e => {
    if (e.keyCode === 13) {
      e.preventDefault();
      handleVerifySubmit(e);
    }
  };

  const handleOriginalOnChange = e => {
    e.preventDefault();
    let value = e.target.value;
    // Automatically remove certain characters from tray barcode input
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/[^0-9A-Z]/g,'');
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
    // Automatically remove certain characters from tray barcode input
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/[^0-9A-Z]/g,'');
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
      dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
    }
  };

  const handleOriginalSubmit = (e) => {
    // Collections aren't inspected live
    const inspectCollection = () => {
      // Check for blank collection only if it's a new item
      if (!data.original.collection && data.itemStatusesInSystem[data.original.item] === null) {
        failure(`You must select a collection.`);
        return false;
      }
      else {
        return true;
      }
    };

    // When inspecting trays upon submission, we want to give a popup for
    // tray length, plus the ordinary live checking. Also, the tray needs
    // to exist in the system.
    const inspectTray = (tray) => {
      if (!trayRegex.test(tray)) {
        return false;
      }
      else if (!data.trayInformation[tray]) {
        failure(`Tray ${tray} does not exist in the system.`);
        return false;
      }
      else {
        return true;
      }
    };

    const inspectItem = (barcode) => {
      if (!barcode) {
        failure(`Please enter an item.`);
        return false;
      }
      const itemVerified = verifyItemOnSubmit(barcode);
      return itemVerified;
    }

    e.preventDefault();
    const collectionPassedInspection = inspectCollection();
    const itemPassedInspection = inspectItem(data.original.item);
    const trayPassedInspection = inspectTray(data.original.tray);
    verifyFolioRecord(data.original.item);
    const timer = setTimeout(() => {
      if (collectionPassedInspection && itemPassedInspection && trayPassedInspection ) {
        dispatch({ type: 'CHANGE_FORM', form: 'verify'});
        dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
      }
      const timer = setTimeout(() => {
        document.getElementById('verify-tray').focus();
      }, 200);
      return () => clearTimeout(timer);
    }, 400);
    return () => clearTimeout(timer);
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();

    // If we only now checked against FOLIO and the item isn't there,
    // go back to the original form
    if (data.original.item !== data.verify.item) {
      failure("Item mismatch!");
    }
    else if (data.original.tray !== data.verify.tray) {
      failure("Tray mismatch!");
    }
    else {
      addItemToStaged({
        barcode: data.original.item,
        collection: data.original.collection,
        tray: data.original.tray,
      });
      updateStagedFromLocalStorage();
      dispatch({ type: "RESET" });
    }
    const timer = setTimeout(() => {
      document.getElementById('original-tray').focus();
    }, 300);
    return () => clearTimeout(timer);
  };

  // Staging area

  const handleProcessAddReturn = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      for (const itemInfo of Object.keys(data.verified).map(key => data.verified[key])) {
        itemInfo["status"] = "Trayed";
        const response = await Load.addReturn(itemInfo);
        if (response && (response.barcode === itemInfo.barcode)) {
          success(`Item ${itemInfo.barcode} successfully returned to tray ${itemInfo.tray}.`);
          removeItemFromStaged(itemInfo);
          dispatch({ type: 'RESET' });
        }
        else {
          const errorPath = process.env.PUBLIC_URL + "/error.mp3";
          const errorAudio = new Audio(errorPath);
          errorAudio.play();
        }
      }
    }
    else {
      failure("You must be connected to the internet to process trays. Please check your internet connection.");
    }
  };

  const addItemToStaged = (itemInfo) => {
    // Mark whether the item is verified in FOLIO or not
    if (data.itemFolioGood.includes(itemInfo.item)) {
      itemInfo.folioVerified = true;
    }
    else {
      itemInfo.folioVerified = false;
    }
    dispatch({ type: 'INCREMENT_TRAY_COUNT', trayBarcode: itemInfo.tray });
    localStorage['addreturnitem-' + itemInfo.barcode] = JSON.stringify(itemInfo);
  };

  const removeItemFromStaged = (itemInfo) => {
    dispatch({ type: 'DECREMENT_TRAY_COUNT', trayBarcode: itemInfo.tray });
    delete localStorage['addreturnitem-' + itemInfo.barcode];
    updateStagedFromLocalStorage();
  };

  const clearStagedAddReturns = () => {
    if (window.confirm('Are you sure you want to clear all staged trays? This action cannot be undone.')) {
      for (const tray of Object.keys(localStorage).filter(key => key.includes('addreturnitem-'))) {
        delete localStorage[tray];
      }
      dispatch({ type: 'RESET' });
      updateStagedFromLocalStorage();
    }
  };

  const itemRegex = new RegExp(data.settings.itemStructure);
  const trayRegex = new RegExp(data.settings.trayStructure);

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        {
          data.defaultCollectionMessage &&
          <Row>
            <Col>
              <p>If you would like a default collection set for your account, please contact {data.settings.databaseAdministrator}.</p>
            </Col>
          </Row>
        }
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <AddReturnFormOriginal
                  handleEnter={handleEnter}
                  handleEnterSubmit={handleEnterOriginalSubmit}
                  collections={data.collections}
                  original={data.original}
                  handleOriginalOnChange={handleOriginalOnChange}
                  handleOriginalSubmit={handleOriginalSubmit}
                  clearOriginal={clearOriginal}
                  form={data.form}
                  disabled={data.form === 'verify'}
                  disabledSubmit={!trayRegex.test(data.original.tray) || !itemRegex.test(data.original.item) }
                  disabledClear={data.original.tray.length === 0 && data.original.item.length === 0}
                  trayRegex={trayRegex}
                  itemRegex={itemRegex}
                  trayBarcodeLength={data.settings.trayBarcodeLength}
                  itemBarcodeLength={data.settings.itemBarcodeLength}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card>
              <CardBody>
              <AddReturnFormVerify
                handleEnter={handleEnter}
                handleEnterSubmit={handleEnterVerifySubmit}
                original={data.original}
                verify={data.verify}
                handleVerifyOnChange={handleVerifyOnChange}
                handleVerifySubmit={handleVerifySubmit}
                goBackToOriginal={goBackToOriginal}
                disabled={data.form === 'original'}
                disabledSubmit={!trayRegex.test(data.verify.tray) || !itemRegex.test(data.verify.item) }
                trayRegex={trayRegex}
                itemRegex={itemRegex}
                trayBarcodeLength={data.settings.trayBarcodeLength}
                itemBarcodeLength={data.settings.itemBarcodeLength}
              />
              </CardBody>
            </Card>
          </Col>
          <Col>
            <Display
              data={data.verified}
              removeItemFromStaged={removeItemFromStaged}
            />
            { Object.keys(data.verified).map(items => items).length
              ? <>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleProcessAddReturn(e)} color="primary">Process all</Button>
                <Button style={{marginRight: '10px'}} color="danger" onClick={(e) => clearStagedAddReturns(e)}>Delete all</Button>
              </>
              : ''
            }
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

const AddReturnFormOriginal = props => (
  <div>
    <Form className="sticky-top" autoComplete="off">
      <FormGroup>
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
          id="original-tray"
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
        <Label for="item">Item{ ' ' }
          { props.itemRegex.test(props.original.item)
            ? <Badge color="success">{props.original.item.length}</Badge>
            : props.original.item.length === 0
              ? <Badge>{props.original.item.length}</Badge>
              : (<><Badge color={props.itemBarcodeLength === props.original.item.length ? "warning" : "danger"}>{props.original.item.length}</Badge> <span className='text-danger'>✘</span></>
              )
          }
        </Label>
        <Input
          id="original-item"
          type="text"
          name="item"
          placeholder="Item barcode"
          value={props.original.item}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            if (!process.env.REACT_APP_ROOT.includes("-dev")) {
              e.preventDefault();
              return false;
            }
          }}
          onKeyDown={(e) => props.handleEnterSubmit(e)}
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
  </div>
);

const AddReturnFormVerify = props => (
  <Form autoComplete="off">
    <FormGroup>
      <Label for="collections">Collection</Label>
      <Input type="text" disabled name="collection" value={ props.original.collection === COLLECTION_PLACEHOLDER ? "" : props.original.collection } />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Tray{ ' ' }
        { props.trayRegex.test(props.verify.tray)
          ? <Badge color="success">{props.verify.tray.length}</Badge>
          : props.verify.tray.length === 0
            ? <Badge>{props.verify.tray.length}</Badge>
            : (<><Badge color={props.trayBarcodeLength === props.verify.tray.length ? "warning" : "danger"}>{props.verify.tray.length}</Badge> <span className='text-danger'>✘</span></>
            )
        }
      </Label>
      <Input
        id="verify-tray"
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
      <Label for="item">Item{ ' ' }
        { props.itemRegex.test(props.verify.item)
          ? <Badge color="success">{props.verify.item.length}</Badge>
          : props.verify.item.length === 0
            ? <Badge>{props.verify.item.length}</Badge>
            : (<><Badge color={props.itemBarcodeLength === props.verify.item.length ? "warning" : "danger"}>{props.verify.item.length}</Badge> <span className='text-danger'>✘</span></>
            )
        }
      </Label>
      <Input
        id="verify-item"
        type="text"
        name="item"
        placeholder={ props.disabled ? "" : "Item barcode" }
        value={props.verify.item}
        onChange={(e) => props.handleVerifyOnChange(e)}
        onPaste={(e)=>{
          if (!process.env.REACT_APP_ROOT.includes("-dev")) {
            e.preventDefault();
            return false;
          }
        }}
        onKeyDown={(e) => props.handleEnterSubmit(e)}
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
  Object.keys(props.data).map((itemInfo, idx) => {
    return (
      <Card key={itemInfo}>
        <CardBody>
          <dl className="row">
            <dt className="col-sm-3">Tray</dt>
            <dd className="col-sm-9">
              {props.data[itemInfo].tray}
            </dd>
            <dt className="col-sm-3">Item</dt>
            <dd className="col-sm-9" style={{whiteSpace: 'pre'}}>
              {props.data[itemInfo].barcode ? props.data[itemInfo].barcode : '-'}
            </dd>
            <dt className="col-sm-3">Collection</dt>
            <dd className="col-sm-9">
              {props.data[itemInfo].collection}
            </dd>
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeItemFromStaged(props.data[itemInfo]);
                }
              }}>
            Delete
          </Button>
        </CardBody>
      </Card>
    );
  })
);

export default AddReturn;
