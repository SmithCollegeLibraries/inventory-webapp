import React, { useReducer, useEffect, Fragment } from 'react';
import Load from '../util/load';
import { Table, Button } from 'reactstrap';

const itemReducer = (state, action) => {
  switch (action.type) {
    case 'GET_DATA':
      return {
        ...state,
        newItems: action.newItems,
        newTrays: action.newTrays,
        traysShelved: action.traysShelved,
      };
    case 'CHANGE_VIEW':
      return {
        ...state,
        currentView: action.view,
      };
    default:
      return state;
  }
};

const Productivity = () => {
  const NEW_ITEMS = "New items";
  const NEW_TRAYS = "New trays";
  const TRAYS_SHELVED = "Trays shelved";

  const initialState = {
    view: NEW_ITEMS,
    newItems: {},
    newTrays: {},
    traysShelved: {},
  };

  const [data, dispatch] = useReducer(itemReducer, initialState);

  const getData = async () => {
    const newItems = await Load.newItemsLog();
    const newTrays = await Load.newTraysLog();
    const traysShelved = await Load.traysShelvedLog();
    dispatch({
      type: "GET_DATA",
      newItems: newItems,
      newTrays: newTrays,
      traysShelved: traysShelved,
    });
  };

  // When a view's button is clicked, change the view
  const changeView = (e) => {
    dispatch({ type: "CHANGE_VIEW", view: e.target.innerText });
  };

  useEffect(() => {
    getData()
  }, []);

  return (
    <Fragment>
      <div style={{paddingTop: "20px"}}>
        <Button color={data.currentView === NEW_ITEMS ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {NEW_ITEMS}
        </Button>{' '}
        <Button color={data.currentView === NEW_TRAYS ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {NEW_TRAYS}
        </Button>{' '}
        <Button color={data.currentView === TRAYS_SHELVED ? "success" : "primary"} onClick={(e) => changeView(e)}>
          {TRAYS_SHELVED}
        </Button>
      </div>
      <h1>{data.currentView}</h1>
      <Table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Tray</th>
            <th>Collection</th>
          </tr>
        </thead>
        <tbody>
          {data.items && data.items.length ? Object.keys(data.items).map((key, index) =>
            <tr key={index}>
              <td>{data.items[key].barcode}</td>
              <td>{data.items[key].tray}</td>
              <td>{data.items[key].collection}</td>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Fragment>
  );
};

export default Productivity;
