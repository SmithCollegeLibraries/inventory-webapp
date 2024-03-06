import React, { useCallback, useEffect, useReducer, Fragment } from 'react';
// import ContentSearch from '../util/search';
import Load from '../util/load';
// import { getFormattedDate } from '../util/date';
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap';
// import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { success, warning, failure } from '../components/toastAlerts';


const AddReturn = () => {
  const initialState = {
    form: 'original',  // Which form is currently being displayed (original or verify)
    original: {
      item: '',
      tray: '',
    },
    verify: {
      item: '',
      tray: '',
    },
    verified: [],  // List of things that have been verified and staged
    settings: {},

    // Containers for all the possible states of verifying trays and items
    itemFolioCheckStarted: [],
    itemFolioBad: [],
    itemFolioGood: [],
    itemFolioOffline: [],
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
      case 'UPDATE_SETTINGS':
        return {
          ...state,
          settings: action.settings,
        };
      case 'ITEM_FOLIO_CHECK_STARTED':
        return {
          ...state,
          itemFolioCheckStarted: [...state.itemFolioCheckStarted, action.item],
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
      case 'ITEM_FOLIO_OFFLINE':
        return {
          ...state,
          itemFolioOffline: [...state.itemFolioBad, action.item],
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
            item: '',
            tray: '',
          },
          verify: {
            item: '',
            tray: '',
          },
          // Don't add 'verified' here! That should not be cleared on reset!

          // Containers for all the possible states of verifying trays and items
          itemFolioCheckStarted: [],
          itemFolioBad: [],
          itemFolioGood: [],
          itemFolioOffline: [],
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  const debouncedLeftPaneItem = useDebounce(data.original.item);

  // Live verification functions, which also get called again on submission
  const failureIfNew = useCallback((barcode, message) => {
    // Only alert if the barcode is not already in the list of alerted barcodes
    // This prevents the same barcode from being alerted multiple times
    // if the user doesn't clear the list of barcodes
    failure(message);
  }, []);

  const verifyItemOnSubmit = (barcode) => {
    // For each barcode, check against the system and then also make sure
    // that it's checked against FOLIO
    var itemRegex = new RegExp(data.settings.itemStructure);
    if (!itemRegex.test(barcode)) {
      failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes are 15 characters long and begin with 31.`);
      return false;
    }
    else if (!verifyItemUnstaged(barcode)) {
      // We're already giving an error message when checking
      return false;
    }
    else {
      if (data.itemFolioGood.includes(barcode) || data.itemFolioOffline.includes(barcode)) {
        return true;
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
  }

  const verifyItemUnstaged = (barcode) => {
    // First see whether it already exists in staged trays
    const arrayOfStagedItems = Object.keys(data.verified).map(tray => data.verified[tray].item);
    const stagedItems = [].concat.apply([], arrayOfStagedItems);
    if (stagedItems.includes(barcode)) {
      failureIfNew(barcode, `Item ${barcode} is already staged`);
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

  // Now the actual hooks that implement the live checks

  useEffect(() => {
    const trayRegex = new RegExp(data.settings.trayStructure);

    // Don't bother doing the live verification if it's not even the
    // correct length or doesn't begin with 1. (We're already showing the
    // user that it's incorrect with the badge, so no need to give a
    // popup alert.)
    if (data.original.tray.length === data.settings.trayBarcodeLength) {
      if (!trayRegex.test(data.original.tray)) {
        failure(`Valid tray barcodes begin with 1.`);
      }
    }
  }, [data.original.tray]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const itemRegex = new RegExp(data.settings.itemStructure);
    const verifyItemLive = async (barcode) => {

      const verifyFolioRecord = async (barcode) => {
        if (navigator.onLine) {
          dispatch({ type: 'ITEM_FOLIO_CHECK_STARTED', item: barcode });
          if (barcode) {
            // First check to see if it's in the database already
            const databaseResults = await Load.itemSearch({"barcodes": [barcode]});
            if (databaseResults.length > 0) {
              dispatch({ type: 'ITEM_FOLIO_GOOD', item: barcode });
            }
            else {
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
            // If it's in the database, don't check FOLIO
          }
          // After getting the results, clear that we've started checking
          // so that we don't get a "perpetual pending" error
          dispatch({ type: 'ITEM_FOLIO_CHECK_CLEAR' });
        }
        else {
          dispatch({ type: 'ITEM_FOLIO_OFFLINE', item: barcode });
        }
        return true;
      };

      // Gives an alert to the user if a barcode has been entered that
      // doesn't exist in FOLIO. Only shows this warning once per barcode.
      // Once checked, barcodes are saved in state so that multiple API
      // calls aren't made to the FOLIO server every time the input field
      // is changed.

      let barcodeToLookupInFolio = null;
      let brokenBarcode = null;
        if (barcode === '') {
          // Don't verify empty "barcodes"
        }
        else if (!itemRegex.test(barcode)) {
          failureIfNew(barcode, `Barcode ${barcode} is not valid. Item barcodes begin with 31 and are 15 characters long.`);
          brokenBarcode = barcode;
        }
        else if (!verifyItemUnstaged(barcode)) {
          // Already giving an alert when checking
          brokenBarcode = barcode;
        }
        else if (data.itemFolioBad.includes(barcode)) {
          failureIfNew(barcode, `Unable to locate FOLIO record for ${barcode}.`);
          brokenBarcode = barcode;
        }
        else {
          if (!data.itemFolioCheckStarted.includes(barcode) && !data.itemFolioGood.includes(barcode) && !data.itemFolioOffline.includes(barcode)) {
            barcodeToLookupInFolio = barcode;
          }
        }

      let itemInFolio = verifyFolioRecord(barcodeToLookupInFolio);
      if (await itemInFolio !== true) {
        return false;
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
      dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
    }
  };

  const handleOriginalSubmit = (e) => {

    // When inspecting trays upon submission, we want to give a popup for
    // tray length, plus the ordinary live checking
    const inspectTray = (tray) => {
      const { trayLength } = data;
      if (!trayRegex.test(tray)) {
        failure(`Tray barcode must be ${trayLength} characters long and begin with 1.`);
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
    // If the user is clicking verify, we want to show them alerts a
    // second time if necessary so they know what the exact problem is
    const timer = setTimeout(() => {
      const itemPassedInspection = inspectItem(data.original.item);
      const trayPassedInspection = inspectTray(data.original.tray);
      if (itemPassedInspection && trayPassedInspection ) {
        dispatch({ type: 'CHANGE_FORM', form: 'verify'});
        dispatch({ type: 'ADD_VERIFY', verify: {item: '', tray: ''} });
      }
    }, 500);
    return () => clearTimeout(timer);
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();

    if (data.original.item !== data.verify.item) {
      failure("Item mismatch!");
    }
    else if (data.original.tray !== data.verify.tray) {
      failure("Tray mismatch!");
    }
    else {
      addItemToStaged({
        barcode: data.original.item,
        tray: data.original.tray,
      });
      updateStagedFromLocalStorage();
      dispatch({ type: "RESET" });
    }
  };

  // Staging area

  const handleProcessAddReturn = async (e) => {
    e.preventDefault();
    if (navigator.onLine === true) {
      for (const itemInfo of Object.keys(data.verified).map(key => data.verified[key])) {
        itemInfo["status"] = "Trayed";
        console.log(itemInfo);
        const response = await Load.addReturn(itemInfo);
        if (response && (response.barcode === itemInfo.barcode)) {
          success(`Item ${itemInfo.barcode} successfully added to tray ${itemInfo.tray}.`);
          removeItemFromStaged(itemInfo.barcode);
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
    localStorage['addreturnitem-' + itemInfo.barcode] = JSON.stringify(itemInfo);
  };

  const removeItemFromStaged = (itemBarcode) => {
    delete localStorage['addreturnitem-' + itemBarcode];
    updateStagedFromLocalStorage();
  };

  const clearStagedAddReturns = () => {
    if (window.confirm('Are you sure you want to clear all staged trays? This action cannot be undone.')) {
      for (const tray of Object.keys(localStorage).filter(key => key.includes('addreturnitem-'))) {
        delete localStorage[tray];
      }
      updateStagedFromLocalStorage();
    }
  };

  const itemRegex = new RegExp(data.settings.itemStructure);
  const trayRegex = new RegExp(data.settings.trayStructure);

  return (
    <Fragment>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="4">
            <Card>
              <CardBody>
                <AddReturnFormOriginal
                  handleEnter={handleEnter}
                  trayLength={data.trayLength}
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
                trayLength={data.trayLength}
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
          disabled={props.disabled}
        />
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
        disabled={props.disabled}
      />
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
            <dt className="col-sm-3">Item</dt>
            <dd className="col-sm-9" style={{whiteSpace: 'pre'}}>
              {props.data[itemInfo].barcode ? props.data[itemInfo].barcode : '-'}
            </dd>
            <dt className="col-sm-3">Tray</dt>
            <dd className="col-sm-9">
              {props.data[itemInfo].tray}
            </dd>
          </dl>
          <Button color="danger" onClick={
              function () {
                if (window.confirm('Are you sure you want to delete this tray? This action cannot be undone.')) {
                  props.removeItemFromStaged(props.data[itemInfo].barcode);
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
