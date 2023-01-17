import React, { useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
import localforage from 'localforage';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, failure, warning } from '../components/toastAlerts';
import { remove } from 'lodash';


const RapidLoad = (props) => {
  const initialState = {
    current: {
      tray: '',
      shelf: '',
      depth: '',
      position: '',
    },
    // We keep track of the most recent tray shelved so that we can
    // double-check that the order it's going in makes sense.
    // We'll ask for confirmation if it doesn't.
    previous: {
      tray: '',
      shelf: '',
      depth: '',
      position: '',
    },
    staged: [],
    // TODO: get these numbers from settings
    trayStructure: /^[0-9]{8}$/,
    shelfStructure: /^[01][0-9][RL][0-9]{4}$/,
    timeout: 0,
  };

  const loadReducer = (state, action) => {
    switch (action.type) {
      case 'UPDATE_CURRENT':
        return {
          ...state,
          current: action.current
        };
      case 'UPDATE_PREVIOUS':
        return {
          ...state,
          previous: action.previous
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
      case 'RESET_PREVIOUS':
        return {
          ...state,
          previous: {
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
          previous: {
            tray: '',
            shelf: '',
            depth: '',
            position: '',
          },
          staged: [],
          timeout: 0,
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(loadReducer, initialState);

  const debouncedTray = useDebounce(data.current.tray);
  const debouncedShelf = useDebounce(data.current.shelf);

  // Anytime the DOM is updated, update local storage
  useEffect(() => {
    const getLocal = async () => {
      const local = await handleLocalStorage('load') || [];
      dispatch({ type: 'UPDATE_STAGED', staged: local});
    };
    getLocal();
  }, []);

  // This is the verification that's done on a tray in real time,
  // as opposed to when data is submitted to the system.
  const verifyTrayLive = tray => {
    // Check that it's not in the list of staged trays
    if (data.staged) {
      const stagedTrays = Object.keys(data.staged).map(x => data.staged[x].tray);
      if (stagedTrays.includes(tray)) {
        failure(`Tray ${tray} is already staged`);
        return false;
      }
    }
    return true;
  };

  const verifyTrayAtSubmit = async (tray) => {
    // Check that the tray exists in the system
    const payload = { "barcode" : tray };
    const results = await Load.getTray(payload);
    if (results === null) {
      failure(`Tray ${tray} does not exist in the system`);
      return false;
    }

    // Check that it's not shelved already
    if (results.shelf !== null) {
      failure(`Tray ${tray} is already shelved in the system`);
      return false;
    }

    // Check that the tray is not empty
    if (results.items.length === 0) {
      failure(`Tray ${tray} is empty and should not be shelved`);
      return false;
    }
  }

  // Check in real time that the tray barcode is the correct length and
  // isn't staged already
  useEffect(() => {
    const trayBarcodeToVerify = debouncedTray;
    if (trayBarcodeToVerify) {
      verifyTrayLive(trayBarcodeToVerify);
    }
  }, [debouncedTray]);

  const verifyBarcodesUnused = async (barcodes) => {
    // First see whether it already exists in staged trays
    const arrayOfStagedBarcodes = Object.keys(data.staged).map(tray => data.staged[tray].items);
    const stagedBarcodes = [].concat.apply([], arrayOfStagedBarcodes);
    for (const barcode of barcodes) {
      if (stagedBarcodes.includes(barcode)) {
        failure(`Item ${barcode} is already staged`);
        return false;
      }
    }

    // Now see whether it is in the database
    const payload = {
      barcodes: barcodes
    };
    const results = await Load.itemSearch(payload);
    if (results && results[0] && results[0]["id"]) {
      results.map(item => {
        if (item["tray"]) {
          failure(`Item ${item["barcode"]} is already in tray ${item["tray"]}`);
        }
        else {
          failure(`Item ${item["barcode"]} is already in the system (untrayed)`);
        }
        return false;
      });
    } else {
      return true;
    }
  };

  const handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key);
    return results;
  }

  const handleOnChange = e => {
    e.preventDefault();
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
    e.preventDefault();
    if (verifyTrayLive()) {
      dispatch({ type: 'UPDATE_PREVIOUS', previous: data.current });
      let staged = data.staged;
      staged[Date.now()] = data.current;
      localforage.setItem('load', staged);
      dispatch({ type: 'UPDATE_STAGED', staged: staged });
      dispatch({ type: 'RESET_CURRENT' });
      // Go back to the first element in the form
      const form = e.target.form;
      form.elements[0].focus();
    }
  };

  const handleUndo = e => {
    e.preventDefault();
    removeTrays([data.previous.tray]);
    dispatch({ type: 'RESET_PREVIOUS' });
    dispatch({ type: 'RESET_CURRENT' });
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
    let submittedTrays = [];
    for (const x of Object.keys(data.staged).map(key => data.staged[key])) {
      const response = await Load.shelveTray(x);
      if (response) {
        success(`Tray ${x.tray} successfully shelved`);
        submittedTrays.push(x.tray);
      }
    }
    removeTrays(submittedTrays);
    dispatch({ type: "RESET_PREVIOUS" });
    dispatch({ type: "RESET_CURRENT" });
  };

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

  const handleEnter = (event) => {
    if (event.keyCode === 13) {
      const form = event.target.form;
      const index = Array.prototype.indexOf.call(form, event.target);
      form.elements[index + 1].focus();
      event.preventDefault();
    }
  };

  const handleEnterTabSubmit = (event) => {
    if (event.keyCode === 13 || event.keyCode === 9) {
      event.preventDefault();
      const form = event.target.form;
      handleSubmit(event);
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
                  handleOnChange={handleOnChange}
                  handleSubmit={handleSubmit}
                  trayStructure={data.trayStructure}
                  shelfStructure={data.shelfStructure}
                  verifyTrayLive={verifyTrayLive}
                />
              </CardBody>
            </Card>
          </Col>
          {/* <Col md="3">
            <Card>
              <CardBody>
                <PreviousShelvingForm
                  previous={data.previous}
                  handleUndo={handleUndo}
                />
              </CardBody>
            </Card>
          </Col> */}
          <Col>
            <Display
              data={data.staged}
              handleDisplayChange={handleDisplayChange}
              removeTrays={removeTrays}
            />
            { Object.keys(data.staged).map(items => items).length
              ? <>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleProcessTrays(e)} color="primary">Process all</Button>
                <Button style={{marginRight: '10px'}} onClick={(e) => handleUndo(e)} color="warning">Undo last</Button>
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

const CurrentShelvingForm = props => (
  <div>
    <Form className="sticky-top" autoComplete="off">
      <FormGroup>
        <Label for="tray">Tray{ ' ' }
          { props.trayStructure.test(props.current.tray)
            ? <><Badge color="success">{props.current.tray.length}</Badge> ✓</>
            : <Badge color="danger">{props.current.tray.length}</Badge>
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
          { props.shelfStructure.test(props.current.shelf)
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
      { props.trayStructure.test(props.current.tray) && props.shelfStructure.test(props.current.shelf) && props.verifyTrayLive(props.current.tray)
        ? <Button style={{marginRight: '10px'}} onClick={e => props.handleSubmit(e)} color="primary">Add</Button>
        : <Button style={{marginRight: '10px'}} onClick={e => e.preventDefault} color="secondary">Add</Button>
      }
    </Form>
  </div>
);

const PreviousShelvingForm = props => (
  <div>
    <Form className="sticky-top">
      <FormGroup>
        <Label for="tray">Previous tray</Label>
        <Input
          type="text"
          name="previousTray"
          value={props.previous.tray}
          disabled={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="shelf">Previous shelf</Label>
        <Input
          type="text"
          name="previousShelf"
          value={props.previous.shelf}
          disabled={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="depth">Previous depth</Label>
        <Input
          type="text"
          name="previousDepth"
          value={props.previous.depth}
          disabled={true}
        />
      </FormGroup>
      <FormGroup>
        <Label for="position">Previous position</Label>
        <Input
          type="text"
          name="previousPosition"
          value={props.previous.position}
          disabled={true}
        />
      </FormGroup>
      <Button color="warning" onClick={props.handleUndo}>
        Undo
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
              {props.data[tray].position}
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

export default RapidLoad;
