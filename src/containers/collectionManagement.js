import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import ContentSearch from '../util/search';
import { Row, Col, Form, Button, Input, Alert, Card, CardBody } from 'reactstrap';

const initialState = {
  collections: [],
  collection: ''
};

const collectionReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_COLLECTIONS':
      return {
        ...state,
        collections: action.collections
      };
    case 'UPDATE_COLLECTION_FORM':
      return {
        ...state,
        collection: action.collections
      };
    case 'UPDATE_COLLECTIONS':
      return {
        ...state,
        collections: action.collections
      };
    default:
      return state;
  }
};

function CollectionManagement(props) {
  const [data, dispatch] = useReducer(collectionReducer, initialState);

  useEffect(() => {
    collections()
  }, []);

  const collections = async () => {
    const search = await ContentSearch.collections();
    dispatch({ type: "ADD_COLLECTIONS", collections: search});
  };

  const handleFormChange = (e) => {
    dispatch({ type: "UPDATE_COLLECTION_FORM", collections: e.target.value});
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const updateData = {
      'name' : data.collection
    };
    const results = await Load.createNewCollection(updateData);
    if (results && results.code === 200) {
      success("New collection successfully created");
      collections();
      props.newCollections();
    } else {
      failure(results.message);
    }
  };

  const handleUpdateFormChange = (e, key) => {
    const collection = data.collections;
    collection[key]["name"] = e.target.value;
    dispatch({ type: "UPDATE_COLLECTIONS", collections: collection});
  };

  const handleUpdateSubmit = async(e, key) => {
    const update = await Load.updateCollection(data.collections[key]);
    if (update) {
      success('Collections updated');
      props.newCollections();
    } else {
      failure("There was a problem updating this collection");
    }
  };

  const handleDeleteSubmit = async(e, data) => {
    e.preventDefault();
    const set = await Load.deleteCollection(data);
    if (set && set.code === 200) {
      success('Collection removed');
      collections();
      props.newCollections();
    } else {
      failure(set.message);
    }
  };

  return (
    <div>
      <ToastContainer />
      <br />
        <Alert color="warning">Changing any of the collection names below can adversely impact the records.  Collection name changes will change all records that are using that collection name.  Please use caution when making updates as changes cannot be reversed.</Alert>
        <div style={{backgroundColor: "#fff", padding: '20px', textAlign: "middle", marginTop: "20px"}}>
          <DisplayForm
            handleFormChange={handleFormChange}
            handleFormSubmit={handleFormSubmit}
          />
        </div>
        <Card>
          <CardBody>
            {Object.keys(data.collections).map((items, idx) => {
              return (
                <Display
                  data={data.collections[items]}
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

export default CollectionManagement;

const DisplayForm = ({ handleFormChange, handleFormSubmit }) => (
  <Form onSubmit={(e) => handleFormSubmit(e)}>
    <Row>
      <Col md="8">
        <Input type="text" onChange={(e) => handleFormChange(e)} name="collection" placeholder="Add a new collection..." />
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
          <Input type="text" onChange={(e) => handleUpdateFormChange(e, index)} value={data.name} name="name" />
        </Col>
        <Col>
          <Button color="primary" onClick={(e) => {if(window.confirm('Warning! This will update all items in this collection. Are you sure you want to update?')){handleUpdateSubmit(e, index)}}}>Update</Button>{' '}
          <Button color="danger" onClick={(e) => {if(window.confirm('Warning! You cannot delete collections that have records tied to them. Are you sure you want to delete this collection?')) {handleDeleteSubmit(e, data)}}}>Delete</Button>
        </Col>
      </Row>
    </div>
  )
};
