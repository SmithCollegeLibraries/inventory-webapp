import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import { Row, Col, Form, Button, Input, Card, CardBody } from 'reactstrap';

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

function ManageItems(props) {
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

  const handleFormChange = (e) => {
    dispatch({ type: "UPDATE_ITEM_FORM", items: e.target.value});
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const createData = {
      'barcode' : data.item
    };
    const results = await Load.createNewItem(createData);
    if (results) {
      success("New item successfully created");
      dispatch({ type: "UPDATE_ITEM_FORM", items: ""});
      items();
      props.newItems();
    } else {
      failure("Unable to create item");
    }
  };

  const handleUpdateFormChange = (e, key) => {
    const item = data.items;
    item[key]["barcode"] = e.target.value;
    dispatch({ type: "UPDATE_ITEMS", items: item});
  };

  const handleUpdateSubmit = async(e, key) => {
    const update = await Load.updateItem(data.items[key]);
    if (update) {
      success('Items updated');
    } else {
      failure("There was a problem updating this item");
    }
    items();
    props.newItems();
  };

  const handleDeleteSubmit = async(e, data) => {
    e.preventDefault();
    const hasItems = await Load.itemHasItems(data);
    if (hasItems) {
      failure("This item cannot be deleted because it has items tied to it");
    } else {
      if (window.confirm("Delete this item? This action can only be undone by the database administrator.")) {
        const set = await Load.deleteItem({id: data.id});
        if (set) {
          success('Item removed');
        } else {
          failure('Item could not be removed');
        }
      }
    }
    items();
    props.newItems();
  };

  return (
    <div>
      <div style={{backgroundColor: "#fff", padding: '20px', textAlign: "middle", marginTop: "20px"}}>
        <DisplayForm
          handleFormChange={handleFormChange}
          handleFormSubmit={handleFormSubmit}
          item={data.item}
        />
      </div>
      <Card>
        <CardBody>
          {Object.keys(data.items).map((items, idx) => {
            return (
              <Display
                data={data.items[items]}
                index={idx}
                key={idx}
                handleUpdateSubmit={handleUpdateSubmit}
                handleUpdateFormChange={handleUpdateFormChange}
                handleDeleteSubmit={handleDeleteSubmit}
              />
            );
          })}
        </CardBody>
      </Card>
    </div>
  );

}

export default ManageItems;

const DisplayForm = ({ handleFormChange, handleFormSubmit, item }) => (
  <Form onSubmit={(e) => handleFormSubmit(e)}>
    <Row>
      <Col md="8">
        <Input type="text" value={item} onChange={(e) => handleFormChange(e)} name="item" placeholder="Add a new item..." />
      </Col>
      <Col md="2">
        <Button color="primary">Submit</Button>
      </Col>
    </Row>
  </Form>
);

const Display = ({ data, index, handleUpdateFormChange, handleUpdateSubmit, handleDeleteSubmit }) => {
  return (
    <div key={index} style={{paddingBottom: "20px"}}>
      <Row>
        <Col md="8">
          <Input type="text" onChange={(e) => handleUpdateFormChange(e, index)} value={data.barcode} name="barcode" />
        </Col>
        <Col>
          {/* <Button color="primary" style={{"marginRight": "10px"}} onClick={(e) => {handleUpdateSubmit(e, index)}}>Update</Button>
          <Button color="danger" onClick={(e) => {handleDeleteSubmit(e, data)}}>Delete</Button> */}
        </Col>
      </Row>
    </div>
  )
};
