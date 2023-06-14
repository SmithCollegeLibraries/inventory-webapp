import React, { useReducer, useEffect, useRef } from 'react';
import { Button, Card, CardBody, Form, Input, Row, Col } from 'reactstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import Load from '../util/load';
import { warning } from '../components/toastAlerts';

// const useDidMountEffect = (func, deps) => {
//   const didMount = useRef(false);
//   useEffect(() => {
//     if (didMount.current) func();
//     else didMount.current = true;
//   }, deps);  // eslint-disable-line
// }

const truncate = (str, n) => {
  return (str.length > n) ? str.substr(0, n-1) + '…' : str;
};

const firstName = (str) => {
  return str.split(' ')[0];
};

const getStagedItems = () => {
  let stagedItems = [];
  // Narrow in only on things relevant to the picklist form
  Object.keys(localStorage).forEach(function(key, index) {
    if (key.includes('picklist-')) {
      try {
        stagedItems.push({
          barcode: key.split('-')[1],
          status: localStorage.getItem(key),
        });
      }
      catch (e) {
        console.error(e);
      }
    }
  });
  return stagedItems;
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SHOWING_ALL':
      return {
        ...state,
        showingAll: action.value,
      };
    case 'BARCODE_CHANGE':
      return {
        ...state,
        newBarcode: action.newBarcode,
      };
    case 'BARCODE_RESET':
      return {
        ...state,
        newBarcode: '',
      };
    case 'HEIGHT_LIMITED':
      return {
        ...state,
        heightLimited: action.heightLimited,
      };
    case 'UPDATE_PICKLIST':
      if (!localStorage['rungMinimum']) {
        localStorage.setItem('rungMinimum', 7);
      }
      if (!localStorage['rungMaximum']) {
        localStorage.setItem('rungMaximum', 19);
      }
      return {
        ...state,
        picklistComplete: action.picklist.filter(i => i['user_id'] !== action.user_id),
        picklistUnassigned: action.picklist.filter(i => i['user_id'] === null),
        picklistVisibleComplete: state.heightLimited ? action.picklist.filter(i => i['rung'] > localStorage['rungMinimum'] && i['rung'] < localStorage['rungMaximum'] && i['user_id'] !== action.user_id) : action.picklist.filter(i => i['user_id'] !== action.user_id),
        picklistVisibleUnassigned: state.heightLimited ? action.picklist.filter(i => i['rung'] > localStorage['rungMinimum'] && i['rung'] < localStorage['rungMaximum'] && i['user_id'] === null) : action.picklist.filter(i => i['user_id'] === null),
        picklistMine: action.picklist.filter(i => i['user_id'] === action.user_id),
      };
    case 'FOLIO_WAITING':
      return {
        ...state,
        folioWaiting: action.payload,
      };
    default:
      throw new Error();
  }
};

const Picklist = () => {
  const initialState = {
    user_id: null,
    newBarcode: '',
    picklistComplete: [],
    picklistUnassigned: [],
    picklistVisibleComplete: [],
    picklistVisibleUnassigned: [],
    picklistMine: [],
    showingAll: false,
    heightLimited: false,
    folioWaiting: false,  // The "Add all from FOLIO" button is disabled while we're waiting for the results from FOLIO so that there is some visual feedback
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  useEffect(() => {
    getPicklist();
  }, []);

  const getPicklist = async () => {
    const user_id = JSON.parse(sessionStorage.getItem('account')).account.id
    const picklist = await Load.getPicklist();
    dispatch({ type: "UPDATE_PICKLIST", picklist: picklist, user_id: user_id });
  };

  const handleBarcodeChange = (e) => {
    e.preventDefault();
    dispatch({
      type: "BARCODE_CHANGE",
      newBarcode: e.target.value,
    });
  };

  const handleAddToPicklist = async (e) => {
    e.preventDefault();
    // If the barcode is blank, do nothing.
    if (!state.newBarcode) {
      return;
    }
    // Check if the barcode is already in the picklist. If show, give
    // a warning.
    else if (state.picklistComplete.find(i => i['barcode'] === state.newBarcode)) {
      warning(`Item ${state.newBarcode} is already in picklist`);
      dispatch({ type: "BARCODE_RESET" });
    }
    // Otherwise, make an API call. The API will give an error if the
    // barcode is invalid.
    else {
      await Load.addItems({"barcodes": [state.newBarcode]});
      dispatch({ type: "BARCODE_RESET" });
      getPicklist();
    }
  };

  const handleAddAllFromFolio = async (e) => {
    e.preventDefault();
    dispatch({ type: "FOLIO_WAITING", payload: true });
    await Load.addFromFolio();
    getPicklist();
    dispatch({ type: "FOLIO_WAITING", payload: false });
  };

  const handleShowUnassigned = (e) => {
    e.preventDefault();
    dispatch({ type: "SHOWING_ALL", value: false });
  };

  const handleShowAll = (e) => {
    e.preventDefault();
    dispatch({ type: "SHOWING_ALL", value: true });
  };

  const handleClaimAllVisible = async (e) => {
    e.preventDefault();
    const listToPick = state.showingAll ? state.picklistVisibleComplete : state.picklistVisibleUnassigned;
    const barcodes = listToPick.map(i => i['barcode']);
    await Load.assignItems({"barcodes": barcodes});
    getPicklist();
  }

  const handleUnclaimAll = async (e) => {
    e.preventDefault();
    const allMyBarcodes = state.picklistMine.map(i => i['barcode']);
    const stagedItems = getStagedItems().map(i => i['barcode']);
    const myUnstagedBarcodes = allMyBarcodes.filter(i => !stagedItems.includes(i));
    await Load.unassignItems({"barcodes": myUnstagedBarcodes});
    getPicklist();
  };

  return (
    <div>
      <Row style={{"display": "flex", "paddingTop": "20px", "paddingBottom": "10px", "paddingLeft": "15px", "paddingRight": "20px"}}>
        <AddForm
          newBarcode={state.newBarcode}
          handleAddToPicklist={handleAddToPicklist}
          handleBarcodeChange={handleBarcodeChange}
        />
        <Button
            color="primary"
            disabled={state.folioWaiting}
            style={{"marginLeft": "auto", "cursor": state.folioWaiting ? "wait" : "pointer"}}
            onClick={handleAddAllFromFolio}
        >
          Add all from FOLIO
        </Button>
      </Row>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="12">
            <Card style={{"cursor": state.folioWaiting ? "progress" : "default"}}>
              <CardBody>
                <Row style={{"display": "flex", "paddingTop": "10px", "paddingBottom": "20px", "paddingLeft": "15px", "paddingRight": "15px"}}>
                  <h1 style={{"fontSize": "150%", "lineHeight": "1", "paddingTop": "6px", "paddingBotton": "6px", "marginRight": "15px" }}>
                    Picks
                  </h1>
                  { state.showingAll
                    ? <Button onClick={handleShowUnassigned} color="success" style={{"marginRight": "10px"}}>Showing all</Button>
                    : <Button onClick={handleShowAll} color="secondary" style={{"marginRight": "10px"}}>Showing unassigned</Button>
                  }
                  <Button color="primary" disabled={state.showingAll ? state.picklistVisibleComplete.length === 0 : state.picklistVisibleUnassigned.length === 0} style={{"marginLeft": "auto" }} onClick={handleClaimAllVisible}>Claim all</Button>
                </Row>
                {/* Don't show this option if there are no items in the list */}
                { state.picklistUnassigned.length > 0 || (state.showingAll && state.picklistComplete.length > 0)
                  ? <div style={{"paddingBottom": "20px", "cursor": "default"}}>
                      <input type="checkbox" value={state.heightLimited} id="heightCheckbox" style={{"marginRight": "10px", "height": "18px", "width": "18px", "marginBottom": "4px", "verticalAlign": "middle"}} />
                      <span style={{"color": state.heightLimited ? "black" : "gray"}}>Hide items in trays below height</span>
                      <input disabled={!state.heightLimited} type="number" min="0" max="33" value={localStorage["minimumHeight"]} style={{"marginLeft": "10px", "marginRight": "10px", "width": "3em"}} />
                      <span style={{"color": state.heightLimited ? "black" : "gray"}}>and above height</span>
                      <input disabled={!state.heightLimited} type="number" min="0" max="33" value={localStorage["maximumHeight"]} style={{"marginLeft": "10px", "marginRight": "10px", "width": "3em"}} />
                    </div>
                  : null
                }
                { state.showingAll
                  ? <PicklistLeftPane picklist={ state.picklistComplete } user_id={JSON.parse(sessionStorage.getItem('account')).account.id} />
                  : <PicklistLeftPane picklist={ state.picklistUnassigned } />
                }
              </CardBody>
            </Card>
          </Col>
          <Col md="12">
            <Card>
              <CardBody>
                <Row style={{"display": "flex", "paddingTop": "10px", "paddingBottom": "20px", "paddingLeft": "15px", "paddingRight": "15px"}}>
                  <h1 style={{"fontSize": "150%", "lineHeight": "1", "paddingTop": "6px", "paddingBotton": "6px", "marginRight": "15px" }}>
                    My items to page
                  </h1>
                  <Button color="warning" disabled={state.picklistMine.length === 0} style={{"marginRight": "10px" }} onClick={handleUnclaimAll}>Unclaim all</Button>
                  <Button color="primary" style={{"marginLeft": "auto" }}>Process all</Button>
                </Row>
                <PicklistRightPane picklist={state.picklistMine} />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

const AddForm = props => {
  return (
    <Form inline style={{"float": "left"}} autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleAddToPicklist(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="newBarcode"
        placeholder="Item barcode"
        value={props.newBarcode}
        onChange={(e) => props.handleBarcodeChange(e)}
      />
      <Button color="primary" style={{"marginRight": "auto"}}>Add to picklist</Button>
    </Form>
  );
};

const PicklistLeftPane = (props) => {

  const handleClaim = async (e, id) => {
    e.preventDefault();
  };

  const handleRemove = async (e, id) => {
    e.preventDefault();
  };

  const leftPaneColumns = [
    {
      dataField: 'barcode',
      text: 'Barcode',
      sort: true,
    },
    {
      dataField: 'title',
      text: 'Title',
      sort: true,
      formatter: (cell, row) => {
        return <><span>{truncate(cell, 64)}</span> <span style={{"color": "#17a2b8"}}>{row.volume}</span></>;
      },
    },
    {
      dataField: 'shelf',
      text: 'Shelf',
      sort: true,
      formatter: (cell, row) => {
        return cell ? cell : "-";
      },
      // When sorting by shelf, ignore the R or L designating row
      sortFunc: (fieldA, fieldB, rowA, rowB) => {
        var noSideA = fieldA.replace(/[^\d]/, '');
        var noSideB = fieldB.replace(/[^\d]/, '');
        return noSideA - noSideB;
      },
    },
    {
      dataField: 'user_id',
      text: 'Assigned to',
      sort: true,
      formatter: (cell, row) => {
        if (!cell) {
          return <span>-</span>;
        }
        else {
          return <span>{firstName(row.assignee)}</span>;
        }
      },
    },
    {
      dataField: 'actions',
      text: 'Actions',
      formatter: (cell, row) => {
        return (
          <div>
            { row.user_id === props.user_id ?
              <Button
                  color="warning"
                  size="sm"
                  style={{"margin": "5px"}}
                  onClick={(e) => handleClaim(e, row.id)}
                >
                Unclaim
              </Button>
              : <Button
                  color="primary"
                  size="sm"
                  style={{"margin": "5px"}}
                  onClick={(e) => handleClaim(e, row.id)}
                >
                Claim
              </Button>
            }
            <Button
                color="danger"
                size="sm"
                style={{"margin": "5px"}}
                onClick={(e) => handleRemove(e, row.id)}
              >
              Remove
            </Button>
          </div>
        );
      }
    },
  ];
  return (
    props.picklist.length > 0
    ? <BootstrapTable
        keyField='id'
        classes="align-middle"
        data={ props.picklist }
        columns={ leftPaneColumns }
        defaultSorted={[
          {dataField: 'shelf', order: 'asc'},
        ]}
      />
    : <span>(No items)</span>
  );
};

const PicklistRightPane = (props) => {

  const handleUnclaim = async (e, id) => {
    e.preventDefault();
  };

  const handleMarkPicked = async (e, id) => {
    e.preventDefault();
  };

  const handleMarkMissing = async (e, id) => {
    e.preventDefault();
  };

  const rightPaneColumns = [
    {
      dataField: 'barcode',
      text: 'Barcode',
      sort: true,
      formatter: (cell, row) => {
        return <span style={{color: localStorage.getItem('picklist-'+cell) ? "lightgray" : "black"}}>{cell}</span>;
      }
    },
    {
      dataField: 'title',
      text: 'Title',
      sort: true,
      formatter: (cell, row) => {
        if (localStorage.getItem('picklist-'+row.barcode)) {
          return <span style={{"color": "lightgray"}}>{truncate(cell, 64)} {row.volume}</span>;
        }
        else {
          return <><span>{truncate(cell, 64)}</span> <span style={{"color": "#17a2b8"}}>{row.volume}</span></>;
        }
      }
    },
    {
      dataField: 'shelf',
      text: 'Shelf',
      sort: true,
      formatter: (cell, row) => {
        return <span style={{color: localStorage.getItem('picklist-'+row.barcode) ? "lightgray" : "black"}}>{cell ? cell : "-"}</span>;
      },
      sortFunc: (fieldA, fieldB, order, dataField, rowA, rowB) => {
        // When sorting by shelf, ignore the R or L designating row
        var noSideA = fieldA.replace(/[^\d]/, '');
        var noSideB = fieldB.replace(/[^\d]/, '');
        if (noSideA > noSideB) {
          return 1;
        }
        else if (noSideA < noSideB) {
          return -1;
        }
        else {
          return 0;
        }
      },
    },
    {
      dataField: 'position',
      text: 'Position',
      sort: true,
      formatter: (cell, row) => {
        return <span style={{color: localStorage.getItem('picklist-'+row.barcode) ? "lightgray" : "black"}}>{row.depth && cell ? row.depth + ", " + cell : "-"}</span>;
      }
    },
    {
      dataField: 'tray',
      text: 'Tray',
      sort: true,
      formatter: (cell, row) => {
        return <span style={{color: localStorage.getItem('picklist-'+row.barcode) ? "lightgray" : "black"}}>{cell ? cell : "-"}</span>;
      },
    },
    {
      dataField: 'actions',
      text: 'Actions',
      sort: true,
      formatter: (cell, row) => {
        return (
          localStorage.getItem('picklist-'+row.barcode)
          ? <Button
                className={localStorage.getItem('picklist-'+row.barcode) === 'Picked' ? "btn-outline-primary" : "btn-outline-secondary"}
                size="sm"
                style={{"margin": "5px"}}
            >
              {"Unmark " + localStorage.getItem('picklist-'+row.barcode)}
            </Button>
          :
          <div>
            <Button
                color="warning"
                size="sm"
                style={{"margin": "5px"}}
                onClick={(e) => handleUnclaim(e, row.id)}
              >
              Unclaim
            </Button>
            <Button
                color="primary"
                size="sm"
                style={{"margin": "5px"}}
                onClick={(e) => handleMarkPicked(e, row.id)}
              >
              Picked
            </Button>
            <Button
                color="secondary"
                size="sm"
                style={{"margin": "5px"}}
                onClick={(e) => handleMarkMissing(e, row.id)}
              >
              Missing
            </Button>
          </div>
        );
      },
      sortFunc: (fieldA, fieldB, order, dataField, rowA, rowB) => {
        // Items that are marked missing or picked go to the bottom
        if (localStorage.getItem('picklist-'+rowA.barcode) && !localStorage.getItem('picklist-'+rowB.barcode)) {
          return 1;
        }
        else if (localStorage.getItem('picklist-'+rowB.barcode) && !localStorage.getItem('picklist-'+rowA.barcode)) {
          return -1;
        }
        else {
          // When sorting by shelf, ignore the R or L designating row
          var noSideA = rowA.shelf ? rowA.shelf.replace(/[^\d]/, '') : '';
          var noSideB = rowB.shelf ? rowB.shelf.replace(/[^\d]/, '') : '';
          if (noSideA > noSideB) {
            return 1;
          }
          else if (noSideA < noSideB) {
            return -1;
          }
          else {
            return 0;
          }
        }
      },
    },
  ];
  return (
    props.picklist.length > 0
    ? <BootstrapTable
        keyField='id'
        classes="align-middle"
        data={ props.picklist }
        columns={ rightPaneColumns }
        defaultSorted={[
          {dataField: 'actions', order: 'asc'},
          {dataField: 'shelf', order: 'asc'},
          {dataField: 'position', order: 'asc'},
        ]}
      />
    : <span>(No items)</span>
  );
};

export default Picklist;
