import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { Row, Col, Table, Button, Input, Card, CardBody } from 'reactstrap';

const itemReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEMS':
      return {
        ...state,
        items: action.items
      };
    case 'UPDATE_ITEM_FORM':
      return {
        ...state,
        item: action.items
      };
    case 'UPDATE_ITEMS':
      return {
        ...state,
        items: action.items
      };
    default:
      return state;
  }
};

const ManageItems = () => {

  const initialState = {
    items: [],
    item: ''
  };

  const [data, dispatch] = useReducer(itemReducer, initialState);

  useEffect(() => {
    items()
  }, []);

  const items = async () => {
    const items = await Load.viewAllItems();
    dispatch({ type: "ADD_ITEMS", items: items});
  };

  return (
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
  );
};

export default ManageItems;
