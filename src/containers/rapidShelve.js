import React, { useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, failure } from '../components/toastAlerts';


const RapidShelve = () => {
  const initialState = {
    current: {
      tray: '',
      shelf: '',
      depth: '',
      position: '',
    },
    staged: [],
    timeout: 0,
    settings: {},
  };

  const loadReducer = (state, action) => {
    switch (action.type) {
      case 'UPDATE_CURRENT':
        return {
          ...state,
          current: action.current
        };
      case 'UPDATE_STAGED':
        return {
          ...state,
          staged: action.staged
        };
      case 'RESET_CURRENT':
        return {
          ...state,
          current: {
            tray: '',
            shelf: '',
            depth: '',
            position: '',
          },
          timeout: 0,
        };
      case 'DELETE_ALL':
        return {
          ...state,
          current: {
            tray: '',
            shelf: '',
            depth: '',
            position: '',
          },
          staged: [],
          timeout: 0,
        };
      case 'UPDATE_SETTINGS':
        return {
          ...state,
          settings: action.settings,
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(loadReducer, initialState);

  const debouncedTray = useDebounce(data.current.tray);

  // Anytime the DOM is updated, update based on local storage
  useEffect(() => {
    const getLocal = async () => {
      const local = await handleLocalStorage('load') || [];
      dispatch({ type: 'UPDATE_STAGED', staged: local});
    };
    getLocal();
  }, []);

  const checkAddPossible = () => {
    // Check that the tray matches the expected structure
    const trayRegex = new RegExp(data.settings.trayStructure);
    const shelfRegex = new RegExp(data.settings.shelfStructure);
    if (!trayRegex.test(data.current.tray)) {
      return false;
    }
    // Check that the shelf matches the expected structure
    else if (!shelfRegex.test(data.current.shelf)) {
      return false;
    }
    // If the tray is already staged, don't allow it to be added again
    else if (!verifyTrayLive(data.current)) {
      return false;
    }
    // Don't allow submission if either the depth or position is empty
    else if (data.current.depth === "" || data.current.position === "") {
      return false;
    }
    else {
      return true;
    }
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
    if (parseInt(data.current.position) === 'NaN' || parseInt(data.current.position) > data.settings.maxPosition || parseInt(data.current.position) < 1) {
      failure(`Position should be a number between 1 and ${data.settings.maxPosition}`);
      return false;
    }
    else if (Object.keys(data.staged).length === 0) {
      return true;
    }
    else {
      const stagedTrayMatches = Object.keys(data.staged).map(x => data.staged[x].shelf === data.current.shelf && data.staged[x].depth === data.current.depth && data.staged[x].position === data.current.position);
      if (stagedTrayMatches.includes(true)) {
        failure(`Shelf ${data.current.shelf}, depth ${data.current.depth}, position ${data.current.position} is already occupied`);
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

      // Check that the tray exists in the system
      if (results === null) {
        failure(`Tray ${tray} does not exist in the system`);
        return false;
      }
      // // Check that it's not shelved already
      // else if (results.shelf !== null) {
      //   failure(`Tray ${tray} is already marked as being on shelf ${results.shelf}`);
      //   return false;
      // }
      // Check that the tray is not empty
      else if (results.items.length === 0) {
        failure(`Tray ${tray} is empty and should not be shelved`);
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

  // Perform real-time checks that don't require an internet connection
  useEffect(() => {
    const trayBarcodeToVerify = debouncedTray;
    const trayRegex = new RegExp(data.settings.trayStructure);
    if (trayBarcodeToVerify) {
      verifyTrayLive(trayBarcodeToVerify);
    }
    // If the tray barcode is the right length but doesn't begin with 1,
    // show a popup message
    if (trayBarcodeToVerify.length === data.settings.trayBarcodeLength && !trayRegex.test(trayBarcodeToVerify)) {
      failure(`Valid tray barcodes begin with 1.`);
    }
  }, [debouncedTray]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPreviousTray = () => {
    if (Object.keys(data.staged).length === 0) {
      return null;
    }
    else {
      return data.staged[0];
    }
  }

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

  const handleOnChange = (e) => {
    e.preventDefault();
    e.persist();

    let value = e.target.value;
    // Remove non-numeric characters from tray barcode
    if (e.target.name === 'tray') {
      value = e.target.value.replace(/\D/g, '');
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

    const current = data.current;
    current[e.target.name] = value;
    dispatch({ type: 'UPDATE_CURRENT', current: current});
  }

  const handleSubmit = async (e) => {
    // If the Add button is disabled, do nothing
    if (checkAddPossible() !== true) {
      return false;
    }

    const processSubmit = async () => {
      const newStaged = [data.current].concat(data.staged);
      localforage.setItem('load', newStaged);
      dispatch({ type: 'UPDATE_STAGED', staged: newStaged });
      dispatch({ type: 'RESET_CURRENT' });
    }

    if (verifyTrayLive(data.current.tray) === true &&
        verifyOnSubmit(data.current.tray) === true &&
        await verifyTrayIfConnected(data.current.tray, data.current.shelf, data.current.depth, data.current.position) === true)
    {
      // Check that the tray is in the expected location, and ask for
      // confirmation if it's not
      const locationCheck = matchesExpectedLocation(data.current.shelf, data.current.depth, data.current.position);
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
        dispatch({ type: 'RESET_CURRENT' });
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
    localforage.setItem('load', staged);
    dispatch({ type: 'UPDATE_STAGED', staged: staged});
  };

  const handleProcessTrays = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      let submittedTrays = [];
      for (const x of Object.keys(data.staged).map(key => data.staged[key])) {
        const response = await Load.shelveTray(x);
        if (response) {
          success(`Tray ${x.tray} successfully shelved`);
          submittedTrays.push(x.tray);
        }
      }
      removeTrays(submittedTrays);
      dispatch({ type: "RESET_CURRENT" });
    }
    else {
      failure("You must be connected to the internet to process trays. Please check your internet connection.");
    }
  };

  const clearShelving = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET_CURRENT' });
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
    localforage.setItem('load', newTrayList);
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

  const handleEnterTabSubmit = e => {
    if (e.keyCode === 13 || e.keyCode === 9) {
      e.preventDefault();
      e.persist();
      handleSubmit(e);
      // Go back to the first element in the form
      const form = e.target.form;
      form.elements[0].focus();
    }
  };

  const clearDisplayGrid = e => {
    if (window.confirm('Are you sure you want to clear all staged trays as well as the current tray? This action cannot be undone.')) {
      dispatch({ type: "RESET" });
      dispatch({ type: 'UPDATE_STAGED', staged: []});
      localforage.setItem('load', {});
    }
  };

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <CurrentShelvingForm
                  handleEnter={handleEnter}
                  handleEnterTabSubmit={handleEnterTabSubmit}
                  current={data.current}
                  settings={data.settings}
                  handleOnChange={handleOnChange}
                  handleSubmit={handleSubmit}
                  verifyTrayLive={verifyTrayLive}
                  checkAddPossible={checkAddPossible}
                  clearShelving={clearShelving}
                  disabledClear={data.current.tray === '' && data.current.shelf === '' && data.current.depth === '' && data.current.position === ''}
                  trayRegex={new RegExp(data.settings.trayStructure)}
                  shelfRegex={new RegExp(data.settings.shelfStructure)}
                />
              </CardBody>
            </Card>
          </Col>
          <Col md="6">
            <Display
              data={data.staged}
              handleDisplayChange={handleDisplayChange}
              removeTrays={removeTrays}
            />
          </Col>
          <Col md="2">
            { Object.keys(data.staged).map(items => items).length ?
              <>
                <Button style={{marginBottom: '60px', marginRight: '10px'}} onClick={(e) => handleProcessTrays(e)} color="primary">Process all</Button>
                <Button style={{marginBottom: '10px', marginRight: '10px'}} onClick={(e) => handleUndo(e)} color="warning">Undo last</Button>
                <Button style={{marginBottom: '10px', marginRight: '10px'}} color="danger" onClick={(e) => clearDisplayGrid(e)}>Delete all</Button>
              </>
              : ''
            }
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

const CurrentShelvingForm = props => (
  <div>
    <Form className="sticky-top" autoComplete="off">
      <FormGroup>
        <Label for="tray">Tray{ ' ' }
          { props.trayRegex.test(props.current.tray)
            ? <><Badge color="success">{props.current.tray.length}</Badge> ✓</>
            : <Badge color={props.settings.trayBarcodeLength === props.current.tray.length ? "warning" : "danger"}>{props.current.tray.length}</Badge>
          }
        </Label>
        <Input
          type="text"
          name="tray"
          placeholder="Tray barcode"
          value={props.current.tray}
          onChange={(e) => props.handleOnChange(e)}
          onPaste={(e)=>{
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnter}
        />
      </FormGroup>
      <FormGroup>
        <Label for="shelf">Shelf{ ' ' }
          { props.shelfRegex.test(props.current.shelf)
            ? <><Badge color="success">{props.current.shelf.length}</Badge> ✓</>
            : (props.current.shelf.length === 7 ? <Badge color="warning">{props.current.shelf.length}</Badge> : <Badge color="danger">{props.current.shelf.length}</Badge>)
          }
        </Label>
        <Input
          type="text"
          name="shelf"
          placeholder="Shelf barcode, e.g. 01R1204"
          value={props.current.shelf}
          onChange={(e) => props.handleOnChange(e)}
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
          name="depth"
          placeholder="Front, Middle, Rear"
          value={props.current.depth}
          onChange={(e) => props.handleOnChange(e)}
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
          name="position"
          placeholder="Position from the left (1, 2, …)"
          value={props.current.position}
          maxLength="2"
          onChange={(e) => props.handleOnChange(e)}
          onPaste={(e) => {
            e.preventDefault()
            return false;
          }}
          onKeyDown={props.handleEnterTabSubmit}
        />
      </FormGroup>
      <Button
          style={{marginRight: '10px'}}
          onClick={e => props.handleSubmit(e)}
          color="primary"
          disabled={!props.checkAddPossible()}>
        Add
      </Button>
      <Button
          style={{marginRight: '10px'}}
          color="warning"
          onClick={(e) => props.clearShelving(e)}
          disabled={props.disabledClear}>
        Clear
      </Button>
    </Form>
  </div>
);

const Display = props => (
  Object.keys(props.data).map((tray, idx) => {
    return (
      <Card key={tray}>
        <CardBody>
          <dl className="row">
            <dt className="col-sm-2">Tray</dt>
            <dd className="col-sm-10">
              {props.data[tray].tray}
            </dd>
            <dt className="col-sm-2">Shelf</dt>
            <dd className="col-sm-10">
              {props.data[tray].shelf}
            </dd>
            <dt className="col-sm-2">Depth</dt>
            <dd className="col-sm-10">
              {props.data[tray].depth}
            </dd>
            <dt className="col-sm-2">Position</dt>
            <dd className="col-sm-10">
              {parseInt(props.data[tray].position)}
            </dd>
          </dl>
          {/* <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeTrays([props.data[tray].tray])
                }
              }}>
            Delete
          </Button> */}
        </CardBody>
      </Card>
    );
  })
);

export default RapidShelve;
