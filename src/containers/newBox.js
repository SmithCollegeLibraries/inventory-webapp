import React, { useEffect, useReducer, useRef, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
import { numericPortion } from '../util/helpers';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, failure } from '../components/toastAlerts';

// Put default collection for each user separately
const COLLECTION_PLACEHOLDER = '--- Select collection ---';


const NewBox = () => {
  const initialState = {
    form: 'original',
    original: {
      collection: '',
      item: '',
      tray: '',
      shelf: '',
      depth: '',
      position: '',
    },
    verify: {
      item: '',
      tray: '',
      shelf: '',
      depth: '',
      position: '',
    },
    staged: [],
    collections: [],
    defaultCollection: '',
    defaultCollectionMessage: false,
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
    itemAlreadyAlerted: [],
  };

  const loadReducer = (state, action) => {
    switch (action.type) {
      case 'UPDATE_ORIGINAL':
        return {
          ...state,
          original: action.original,
        };
      case 'UPDATE_VERIFY':
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
          staged: action.staged,
        };
      case 'RESET_VERIFY':
        return {
          ...state,
          form: 'original',
          verify: {
            item: '',
            tray: '',
            shelf: '',
            depth: '',
            position: '',
          },
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
          itemAlreadyAlerted: [],
        };
      case 'RESET':
        return {
          ...state,
          form: "original",
          original: {
            collection: state.original.collection,
            item: '',
            tray: '',
            shelf: '',
            depth: '',
            position: '',
          },
          verify: {
            item: '',
            tray: '',
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
          itemAlreadyAlerted: [],
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(loadReducer, initialState);

  const debouncedOriginalTray = useDebounce(data.original.tray);

  // Anytime the DOM is updated, update based on local storage
  useEffect(() => {
    const getLocal = async () => {
      const local = await handleLocalStorage('newbox') || [];
      dispatch({ type: 'UPDATE_STAGED', staged: local});
    };
    getLocal();
  }, []);

  // When the form changes, focus on the first input
  useEffect(() => {
    if (data.form === 'original') {
      originalRef.current.focus();
    }
    else if (data.form === 'verify') {
      verifyRef.current.focus();
    }
  }, [data.form]);

  const checkVerifyPossible = () => {
    // Check that the tray matches the expected structure
    const itemRegex = new RegExp(data.settings.itemStructure);
    const trayRegex = new RegExp(data.settings.trayStructure);
    const shelfRegex = new RegExp(data.settings.shelfStructure);

    // Check that the item matches the expected structure
    if (!itemRegex.test(data.original.item)) {
      return false;
    }
    // Check that the tray matches the expected structure
    else if (!trayRegex.test(data.original.tray)) {
      return false;
    }
    // Check that the shelf matches the expected structure
    else if (!shelfRegex.test(data.original.shelf)) {
      return false;
    }
    // If the tray is already staged, don't allow it to be added again
    else if (!verifyTrayLive(data.original)) {
      return false;
    }
    // Don't allow submission if either the depth or position is empty
    else if (data.original.depth === "" || data.original.position === "") {
      return false;
    }
    else {
      return true;
    }
  }

  const checkAddPossible = () => {
    // Check that the verify section matches the original section
    return ((data.original.item === data.verify.item)
        && (data.original.tray === data.verify.tray));
  }

  // This is the verification that's done on a tray in real time,
  // as opposed to when data is submitted to the system. It checks that
  // the barcode is not already in the list of staged trays.
  const verifyTrayLive = tray => {
    if (data.staged) {
      const stagedTrays = Object.keys(data.staged).map(x => data.staged[x].tray);
      if (stagedTrays.includes(tray)) {
        failure(`Tray ${tray} is already staged`);
        return false;
      }
    }
    return true;
  };

  // This is the verification that's done when the user submits data
  const verifyOnSubmit = tray => {
    if (parseInt(data.original.position) === 'NaN' || parseInt(data.original.position) > data.settings.maxPosition || parseInt(data.original.position) < 1) {
      failure(`Position should be a number between 1 and ${data.settings.maxPosition}`);
      return false;
    }
    else if (Object.keys(data.staged).length === 0) {
      return true;
    }
    else {
      const stagedTrayMatches = Object.keys(data.staged).map(x => data.staged[x].shelf === data.original.shelf && data.staged[x].depth === data.original.depth && data.staged[x].position === data.original.position);
      if (stagedTrayMatches.includes(true)) {
        failure(`Shelf ${data.original.shelf}, depth ${data.original.depth}, position ${data.original.position} is already occupied`);
        return false;
      }
      else {
        return true;
      }
    }
  };

  // If the user is connected to the internet, do additional verification;
  // otherwise, we have to assume that everything is OK, and flag anything
  // anomalous at the point of submission
  const verifyTrayIfConnected = async (tray, shelf, depth, position) => {
    if (navigator.onLine === true) {
      const payload = { "barcode" : tray };
      const results = await Load.getTray(payload);

      const locationPayload = {
        "shelf": shelf,
        "depth": depth,
        "position": position,
      };
      const locationResults = await Load.searchTraysByLocation(locationPayload);

      // Check that the tray does not in the system
      if (results !== null) {
        failure(`Tray ${tray} already exists in the system`);
        return false;
      }
      // Check that the location of the new tray isn't already taken
      else if (locationResults.length > 0) {
        // TODO: print more than just the first result
        failure(`Location ${shelf}, depth ${depth}, position ${position} is already occupied by tray ${locationResults[0].barcode}`);
        return false;
      }
      else {
        return true;
      }
    }
    else {
      return true;
    }
  }

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
      const collections = await Load.getUnverifiedCollections();
      dispatch({ type: 'UPDATE_COLLECTIONS', collections: collections});
    };
    getCollections();
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


  // Perform real-time checks that don't require an internet connection
  useEffect(() => {
    const trayBarcodeToVerify = debouncedOriginalTray;
    const trayRegex = new RegExp(data.settings.trayStructure);

    if (trayBarcodeToVerify) {
      verifyTrayLive(trayBarcodeToVerify);
    }
    // If the tray barcode is the right length but doesn't begin with 1,
    // show a popup message
    if (trayBarcodeToVerify.length === data.settings.trayBarcodeLength && !trayRegex.test(trayBarcodeToVerify)) {
      failure(`Valid tray barcodes begin with 1.`);
    }
  }, [debouncedOriginalTray]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPreviousTray = () => {
    if (Object.keys(data.staged).length === 0) {
      return null;
    }
    else {
      return data.staged[0];
    }
  }

  const originalRef = useRef(null);
  const verifyRef = useRef(null);

  // Make sure that the new tray is shelved in an expected location:
  // i.e. the next position in the same depth, or the first position
  // in the next depth, or the first position on the next shelf
  const matchesExpectedLocation = (shelf, depth, position) => {
    const previous = getPreviousTray();

    const isNextConsecutiveShelf = (newShelf, previousShelf) => {
      // These variables are used to calculate the next expected shelf
      const previousRow = parseInt(previousShelf.slice(0, 2));
      const previousSide = previousShelf.slice(2, 3) === 'L' ? 0 : 1;
      const previousLadder = parseInt(previousShelf.slice(3, 5));
      const previousRung = parseInt(previousShelf.slice(5, 7));
      const newRow = parseInt(newShelf.slice(0, 2));
      const newSide = newShelf.slice(2, 3) === 'L' ? 0 : 1;
      const newLadder = parseInt(newShelf.slice(3, 5));
      const newRung = parseInt(newShelf.slice(5, 7));

      if (newRow === previousRow) {
        if (newSide === previousSide) {
          if (newLadder === previousLadder) {
            return newRung === previousRung + 1;
          }
          else {
            return newLadder === previousLadder + 1 && newRung === 1;
          }
        }
        else {
          return newSide === previousSide + 1 && newLadder === 1 && newRung === 1;
        }
      }
      else {
        return newRow === previousRow + 1 && newSide === 0 && newLadder === 1 && newRung === 1;
      }
    }

    // If there are no trays staged, then the new tray can be anywhere
    if (previous === null) {
      return true;
    }
    else if (shelf === previous.shelf) {
      if (depth === previous.depth) {
        if (parseInt(position) === parseInt(previous.position) + 1) {
          return true;
        }
        else {
          return "The tray is on the same shelf as the last one, but not in the next position.";
        }
      }
      else {
        // Can't shelve in front of a tray that's already in the front
        if (previous.depth === "Front" || (previous.depth === "Middle" && depth === "Rear")) {
          if (parseInt(position) === 1) {
            return "You are currently shelving front to back.";
          }
          else {
            return "You are currently shelving front to back. Also, the tray is not in first position, even though you are starting a new depth.";
          }
        }
        else {
          if (parseInt(position) === 1) {
            return true;
          }
          else {
            return "The tray is on the same shelf at a new depth, but not in first position.";
          }
        }
      }
    }
    else if (isNextConsecutiveShelf(shelf, previous.shelf)) {
      if (depth !== "Rear") {
        if (parseInt(position) === 1) {
          return "The tray is on a new shelf, but should be in the rear.";
        }
        else {
          return "The tray is on a new shelf, but not in first position. Also, it should be in the rear.";
        }
      }
      else {
        if (parseInt(position) === 1) {
          return true;
        }
        else {
          return "The tray is on a new shelf, but not in first position.";
        }
      }
    }
    else {
      return "The tray is not on the same shelf as the last tray, nor on the next shelf.";
    }
  }

  const handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  }

  const processFieldChanges = (e) => {
    let value = e.target.value;
    // Remove non-accepted characters from tray barcode
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/[^0-9A-Z]/g,'');
    }
    // Remove non-accepted characters from shelf barcode
    if (e.target.name === 'shelf') {
      value = e.target.value.replace(/[^0-9LRlr]/g, '').toUpperCase();
    }
    // Remove non-numeric characters from position barcode
    if (e.target.name === 'position') {
      value = e.target.value.replace(/\D/g, '');
    }
    // Rapid entry for depth: single keystroke fills out Front, Middle,
    // Rear and moves to the next field
    if (e.target.name === 'depth') {
      const goodKeys = ['F', 'M', 'R', 'f', 'm', 'r', 'Front', 'Middle', 'Rear'];
      if (goodKeys.includes(value)) {
        if (value === 'F' || value === 'f' || value === 'Front') {
          value = 'Front';
        }
        else if (value === 'M' || value === 'm' || value === 'Middle') {
          value = 'Middle';
        }
        else if (value === 'R' || value === 'r' || value === 'Rear') {
          value = 'Rear';
        }
        const form = e.target.form;
        const index = Array.prototype.indexOf.call(form, e.target);
        form.elements[index + 1].focus();
      }
      else {
        value = '';
      }
    }
    return value;
  }

  const handleOriginalOnChange = (e) => {
    e.preventDefault();
    e.persist();

    const original = data.original;
    original[e.target.name] = processFieldChanges(e);
    dispatch({ type: 'UPDATE_ORIGINAL', original: original});
  }

  const handleVerifyOnChange = (e) => {
    e.preventDefault();
    e.persist();

    const verify = data.verify;
    verify[e.target.name] = processFieldChanges(e);
    dispatch({ type: 'UPDATE_VERIFY', verify: verify});
  };

  const handleSubmitOriginal = async (e) => {
    // If the Add button is disabled, do nothing
    if (checkVerifyPossible() !== true) {
      return false;
    }

    const processSubmit = async () => {
      dispatch({ type: 'CHANGE_FORM', form: 'verify' });
    }

    if (verifyTrayLive(data.original.tray) === true &&
        verifyOnSubmit(data.original.tray) === true &&
        await verifyTrayIfConnected(data.original.tray, data.original.shelf, data.original.depth, data.original.position) === true)
    {
      // Check that the tray is in the expected location, and ask for
      // confirmation if it's not
      const locationCheck = matchesExpectedLocation(data.original.shelf, data.original.depth, data.original.position);
      // There will be an error message if it's not true
      if (locationCheck === true) {
        processSubmit();
      }
      else {
        if (window.confirm(`${locationCheck} Are you sure that the shelf, depth and location are correct?`)) {
          processSubmit();
        }
      }
    }
  };

  const handleSubmitVerify = async (e) => {
    // If the Add button is disabled, do nothing
    if (checkAddPossible() !== true) {
      return false;
    }

    const processSubmit = async () => {
      const newStaged = [data.original].concat(data.staged);
      localforage.setItem('newbox', newStaged);
      dispatch({ type: 'UPDATE_STAGED', staged: newStaged });
      dispatch({ type: 'RESET' });
    }

    if (verifyTrayLive(data.original.tray) === true &&
        verifyOnSubmit(data.original.tray) === true &&
        await verifyTrayIfConnected(data.original.tray, data.original.shelf, data.original.depth, data.original.position) === true)
    {
      // Check that the tray is in the expected location, and ask for
      // confirmation if it's not
      const locationCheck = matchesExpectedLocation(data.original.shelf, data.original.depth, data.original.position);
      // There will be an error message if it's not true
      if (locationCheck === true) {
        processSubmit();
      }
      else {
        if (window.confirm(`${locationCheck} Are you sure that the shelf, depth and location are correct?`)) {
          processSubmit();
        }
      }
    }
  };

  const handleUndo = e => {
    e.preventDefault();
    e.persist();

    if (window.confirm("Are you sure you want to clear the last shelved tray? This action cannot be undone.")) {
      const previousTray = getPreviousTray();
      if (previousTray) {
        removeTrays([previousTray.tray]);
        dispatch({ type: 'RESET' });
      }
    }
  };

  const handleDisplayChange = (e, key) => {
    const staged = data.staged;
    const values = {
      ...staged[key],
      [e.currentTarget.name]: e.currentTarget.value,
    };

    staged[key] = values;
    localforage.setItem('newbox', staged);
    dispatch({ type: 'UPDATE_STAGED', staged: staged});
  };

  const handleProcessBoxes = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      let submittedTrays = [];
      for (const x of Object.keys(data.staged).map(key => data.staged[key])) {
        // Adjust parameter names for API
        x['items'] = [x['item']];
        x['barcode'] = x['tray'];
        const response = await Load.shelveTray(x);
        if (response) {
          success(`Tray ${x.tray} successfully shelved`);
          submittedTrays.push(x.tray);
        }
      }
      removeTrays(submittedTrays);
      dispatch({ type: "RESET" });
    }
    else {
      failure("You must be connected to the internet to process trays. Please check your internet connection.");
    }
  };

  const clearOriginal = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET' });
  }

  const goBackToOriginal = (e) => {
    e.preventDefault();
    if ((!data.verify.item && !data.verify.tray) || window.confirm('Are you sure you want to clear the verification pane and go back to editing the box information? This action cannot be undone.')) {
      dispatch({ type: 'CHANGE_FORM', form: 'original'});
      dispatch({ type: 'RESET_VERIFY' });
    }
  }

  // We want to be able to remove more than one tray at a time from the
  // staging list because after submitting, we are keeping track of
  // which ones have been submitted and need to remove all the submitted
  // trays at once
  const removeTrays = (trayBarcodes) => {
    const stagedTrays = data.staged;
    // Create list of trays staged for submission, without the trays
    // that were just removed
    const newTrayList = Object.keys(stagedTrays)
        .map(key => stagedTrays[key])
        .filter(x => !trayBarcodes.includes(x.tray));
    dispatch({ type: 'UPDATE_STAGED', staged: newTrayList});
    localforage.setItem('newbox', newTrayList);
  };

  const handleEnter = e => {
    if (e.keyCode === 13) {
      e.preventDefault();
      e.persist();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      form.elements[index + 1].focus();
    }
  };

  const handleEnterTabSubmitOriginal = e => {
    if (e.keyCode === 13 || e.keyCode === 9) {
      e.preventDefault();
      e.persist();
      handleSubmitOriginal(e);
    }
  };

  const handleEnterTabSubmitVerify = e => {
    if (e.keyCode === 13 || e.keyCode === 9) {
      e.preventDefault();
      e.persist();
      handleSubmitVerify(e);
    }
  }

  const clearDisplayGrid = e => {
    if (window.confirm('Are you sure you want to clear all staged trays as well as the current tray? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
      dispatch({ type: 'UPDATE_STAGED', staged: []});
      localforage.setItem('newbox', {});
    }
  };

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <OriginalShelvingForm
                  ref={originalRef}
                  handleEnter={handleEnter}
                  handleEnterTabSubmit={handleEnterTabSubmitOriginal}
                  collections={data.collections}
                  original={data.original}
                  settings={data.settings}
                  handleOriginalOnChange={handleOriginalOnChange}
                  handleSubmitOriginal={handleSubmitOriginal}
                  verifyTrayLive={verifyTrayLive}
                  checkVerifyPossible={checkVerifyPossible}
                  clearOriginal={clearOriginal}
                  disabled={data.form === 'verify'}
                  disabledSubmit={data.original.item === '' || data.original.tray === '' || data.original.shelf === '' || data.original.depth === '' || data.original.position === ''}
                  disabledClear={data.original.tray === '' && data.original.shelf === '' && data.original.depth === '' && data.original.position === ''}
                  itemRegex={new RegExp(data.settings.itemStructure)}
                  trayRegex={new RegExp(data.settings.trayStructure)}
                  shelfRegex={new RegExp(data.settings.shelfStructure)}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card>
              <CardBody>
                <VerifyShelvingForm
                  ref={verifyRef}
                  handleEnter={handleEnter}
                  handleEnterTabSubmit={handleEnterTabSubmitVerify}
                  collections={data.collections}
                  original={data.original}
                  verify={data.verify}
                  settings={data.settings}
                  handleVerifyOnChange={handleVerifyOnChange}
                  handleSubmitVerify={handleSubmitVerify}
                  checkAddPossible={checkAddPossible}
                  goBackToOriginal={goBackToOriginal}
                  disabled={data.form === 'original'}
                  disabledSubmit={data.verify.item === '' || data.verify.tray === '' || data.verify.item !== data.original.item || data.verify.tray !== data.original.tray}
                  itemRegex={new RegExp(data.settings.itemStructure)}
                  trayRegex={new RegExp(data.settings.trayStructure)}
                  shelfRegex={new RegExp(data.settings.shelfStructure)}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            { Object.keys(data.staged).map(items => items).length ?
              <Row style={{"display": "flex", "marginBottom": "20px"}}>
                <Button style={{marginBottom: '10px', marginLeft: '15px', marginRight: '10px'}} onClick={(e) => handleProcessBoxes(e)} color="primary">Process all</Button>
                <Button style={{marginBottom: '10px', marginRight: '10px'}} onClick={(e) => handleUndo(e)} color="warning">Undo last</Button>
                <Button style={{marginBottom: '10px', marginLeft: 'auto', marginRight: '15px'}} color="danger" onClick={(e) => clearDisplayGrid(e)}>Delete all</Button>
              </Row>
              : ''
            }
            <Display
              staged={data.staged}
              removeTrays={removeTrays}
              handleDisplayChange={handleDisplayChange}
              handleProcessBoxes={handleProcessBoxes}
              handleUndo={handleUndo}
              clearDisplayGrid={clearDisplayGrid}
            />
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

const OriginalShelvingForm = React.forwardRef((props, ref) =>  (
  <div>
    <Form className="sticky-top" autoComplete="off">
      <FormGroup>
        <Label for="collections">Collection</Label>
        <Input type="select" disabled={props.disabled} value={props.original.collection} onChange={(e) => props.handleOriginalOnChange(e)} name="collection">
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
        <Label for="item">Item{ ' ' }
          { props.itemRegex.test(props.original.item)
            ? <><Badge color="success">{props.original.item.length}</Badge> ✓</>
            : <Badge color={props.original.item.length === 0 ? "secondary" : props.settings.itemBarcodeLength === props.original.item.length ? "warning" : "danger"}>{props.original.item.length}</Badge>
          }
        </Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="item"
          ref={ref}
          placeholder="Item barcode, e.g. 310183630375201"
          value={props.original.item}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="tray">Tray (box){ ' ' }
          { props.trayRegex.test(props.original.tray)
            ? <><Badge color="success">{numericPortion(props.original.tray).length}</Badge> ✓</>
            : <Badge color={props.original.tray.length === 0 ? "secondary" : props.settings.trayBarcodeLength === numericPortion(props.original.tray).length ? "warning" : "danger"}>{numericPortion(props.original.tray).length}</Badge>
          }
        </Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="tray"
          placeholder="Tray-style barcode, e.g. 10001234"
          value={props.original.tray}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="shelf">Shelf{ ' ' }
          { props.shelfRegex.test(props.original.shelf)
            ? <><Badge color="success">{props.original.shelf.length}</Badge> ✓</>
            : <Badge color={props.original.shelf.length === 0 ? "secondary" : (props.original.shelf.length === props.settings.shelfBarcodeLength ? "warning" : "danger")}>{props.original.shelf.length}</Badge>
          }
        </Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="shelf"
          placeholder="Shelf barcode, e.g. 01R1204"
          value={props.original.shelf}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="depth">Depth</Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="depth"
          placeholder="Front, Middle, Rear"
          value={props.original.depth}
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="position">Position</Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="position"
          placeholder="Position from the left (1, 2, …)"
          value={props.original.position}
          maxLength="2"
          onChange={(e) => props.handleOriginalOnChange(e)}
          onPaste={(e) => {
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnterTabSubmit}
        />
      </FormGroup>
      <Button
          style={{marginRight: '10px'}}
          onClick={e => props.handleSubmitOriginal(e)}
          color="primary"
          disabled={props.disabled || !props.checkVerifyPossible()}>
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
));

const VerifyShelvingForm = React.forwardRef((props, ref) =>  (
  <div>
    <Form style={{zIndex: 0}} className="sticky-top" autoComplete="off">
      <FormGroup>
        <Label for="collections">Collection</Label>
        <Input type="text" disabled name="collection" value={props.original.collection === COLLECTION_PLACEHOLDER ? "" : props.original.collection} />
      </FormGroup>
      <FormGroup>
        <Label for="item">Item{ ' ' }
          { props.itemRegex.test(props.verify.item) && props.original.item === props.verify.item
            ? <><Badge color="success">{props.verify.item.length}</Badge> ✓</>
            : <Badge color={props.verify.item.length === 0 ? "secondary" : (props.settings.itemBarcodeLength === props.verify.item.length ? "warning" : "danger")}>{props.verify.item.length}</Badge>
          }
        </Label>
        <Input
          type="text"
          ref={ref}
          disabled={props.disabled}
          name="item"
          placeholder={ props.disabled ? "" : "Item barcode, e.g. 310183630375201" }
          value={props.verify.item}
          onChange={(e) => props.handleVerifyOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="tray">Tray (box){ ' ' }
          { props.trayRegex.test(props.verify.tray) && props.original.tray === props.verify.tray
            ? <><Badge color="success">{numericPortion(props.verify.tray).length}</Badge> ✓</>
            : <Badge color={props.verify.tray.length === 0 ? "secondary" : (props.settings.trayBarcodeLength === numericPortion(props.verify.tray).length ? "warning" : "danger")}>{numericPortion(props.verify.tray).length}</Badge>
          }
        </Label>
        <Input
          type="text"
          disabled={props.disabled}
          name="tray"
          placeholder={ props.disabled ? "" : "Tray-style barcode, e.g. 10001234" }
          value={props.verify.tray}
          onChange={(e) => props.handleVerifyOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnterTabSubmit}
        />
      </FormGroup>
      <Button
          style={{marginRight: '10px'}}
          onClick={e => props.handleSubmitVerify(e)}
          color="primary"
          disabled={props.disabled || props.disabledSubmit}>
        Add
      </Button>
      <Button
          style={{marginRight: '10px'}}
          color="warning"
          onClick={(e) => props.goBackToOriginal(e)}
          disabled={props.disabled}>
        Go back
      </Button>
    </Form>
  </div>
));


const Display = props => (
  Object.keys(props.staged).map((tray, idx) => {
    return (
      <Card key={tray}>
        <CardBody>
          <dl className="row">
            <dt className="col-sm-4">Item</dt>
            <dd className="col-sm-8">
              {props.staged[tray].item}
            </dd>
            <dt className="col-sm-4">Tray</dt>
            <dd className="col-sm-8">
              {props.staged[tray].tray}
            </dd>
            <dt className="col-sm-4">Shelf</dt>
            <dd className="col-sm-8">
              {props.staged[tray].shelf}
            </dd>
            <dt className="col-sm-4">Depth</dt>
            <dd className="col-sm-8">
              {props.staged[tray].depth}
            </dd>
            <dt className="col-sm-4">Position</dt>
            <dd className="col-sm-8">
              {parseInt(props.staged[tray].position)}
            </dd>
          </dl>
        </CardBody>
      </Card>
    );
  })
);

export default NewBox;
