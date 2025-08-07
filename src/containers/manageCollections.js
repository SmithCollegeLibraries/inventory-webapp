import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import ContentSearch from '../util/search';
import { Row, Col, Form, Button, Input, Card, CardBody } from 'reactstrap';


function ManageCollections() {

  const initialState = {
    existingCollections: [],
    newCollection: {
      name: "",
      code: "",
      folio_validated: true,
    },
  };

  const collectionReducer = (state, action) => {
    switch (action.type) {
      case 'ADD_EXISTING_COLLECTIONS':
        return {
          ...state,
          existingCollections: action.collections,
        };
      case 'UPDATE_NEW_COLLECTION_FORM':
        return {
          ...state,
          newCollection: action.collection,
        };
      case 'UPDATE_EXISTING_COLLECTIONS':
        return {
          ...state,
          existingCollections: action.collections,
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(collectionReducer, initialState);

  useEffect(() => {
    getCollections();
  }, []);

  const getCollections = async () => {
    const search = await ContentSearch.collections();
    search.sort((a, b) => a.name.localeCompare(b.name));
    dispatch({ type: "ADD_EXISTING_COLLECTIONS", collections: search});
  };

  const handleNewCollectionFormChange = (e) => {
    dispatch({
      type: "UPDATE_NEW_COLLECTION_FORM",
      collection: {
        ...data.newCollection,
        [e.target.name]: e.target.value,
      },
    });
  };

  const handleToggleNewCollectionFolioValidation = async (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_NEW_COLLECTION_FORM",
      collection: {
        ...data.newCollection,
        folio_validated: !data.newCollection.folio_validated,
      },
    });
  }

  const handleNewCollectionFormSubmit = async (e) => {
    e.preventDefault();
    const createData = {
      'name' : data.newCollection.name,
      'code' : data.newCollection.code ? data.newCollection.code : null,
      'folio_validated' : data.newCollection.folio_validated,
    };
    console.log(createData);
    const results = await Load.createNewCollection(createData);
    if (results) {
      success("New collection successfully created");
      dispatch({
        type: "UPDATE_NEW_COLLECTION_FORM",
        collection: {
          name: "",
          code: "",
          folio_validated: true,
        }}
      );
      getCollections();
    }
  };

  const handleUpdateFormChange = (e, key) => {
    const collection = data.existingCollections;
    collection[key][e.target.name] = e.target.value;
    dispatch({ type: "UPDATE_EXISTING_COLLECTIONS", collections: collection});
  };

  const handleToggleUpdateFormFolioValidation = (e, key) => {
    e.preventDefault();
    const collection = data.existingCollections;
    collection[key]["folio_validated"] = !collection[key]["folio_validated"];
    dispatch({ type: "UPDATE_EXISTING_COLLECTIONS", collections: collection});
  };

  const handleUpdateSubmit = async(e, key) => {
    let newData = {
      id: data.existingCollections[key].id,
      name: data.existingCollections[key].name,
      // If code is not set, use the name as the code
      code: data.existingCollections[key].code ? data.existingCollections[key].code : data.existingCollections[key].name,
      folio_validated: data.existingCollections[key].folio_validated,
    }
    const update = await Load.updateCollection(newData);
    if (update) {
      success('Collections updated');
    } else {
      failure("There was a problem updating this collection");
    }
    getCollections();
  };

  const handleDeleteSubmit = async(e, data) => {
    e.preventDefault();
    const hasItems = await Load.collectionHasItems(data.id);
    if (hasItems) {
      failure("This collection cannot be deleted because it has items tied to it");
    } else {
      if (window.confirm("Delete this collection? This action can only be undone by the database administrator.")) {
        const set = await Load.deleteCollection({id: data.id});
        if (set) {
          success('Collection removed');
        } else {
          failure('Collection could not be removed');
        }
      }
    }
    getCollections();
  };

  return (
    <div>
      <div style={{backgroundColor: "#fff", padding: '20px', textAlign: "middle", marginTop: "20px"}}>
        <DisplayNewCollectionForm
          handleNewCollectionFormChange={handleNewCollectionFormChange}
          handleNewCollectionFormSubmit={handleNewCollectionFormSubmit}
          handleToggleNewCollectionFolioValidation={handleToggleNewCollectionFolioValidation}
          newCollection={data.newCollection}
        />
      </div>
      <Card>
        <CardBody>
          {data.existingCollections ? Object.keys(data.existingCollections).map((items, idx) => {
            return (
              <DisplayExistingCollections
                data={data.existingCollections[items]}
                index={idx}
                key={idx}
                handleUpdateSubmit={handleUpdateSubmit}
                handleUpdateFormChange={handleUpdateFormChange}
                handleToggleUpdateFormFolioValidation={handleToggleUpdateFormFolioValidation}
                handleDeleteSubmit={handleDeleteSubmit}
              />
            );
          }) : null}
        </CardBody>
      </Card>
    </div>
  );

}

export default ManageCollections;

const DisplayNewCollectionForm = ({ handleNewCollectionFormChange, handleNewCollectionFormSubmit, newCollection, handleToggleNewCollectionFolioValidation }) => {

  return (
    <Form autoComplete="off">
      <Row>
        <Col md="4" style={{ maxWidth: "30em" }}>
          <Input type="text" value={newCollection.name} onChange={(e) => handleNewCollectionFormChange(e)} name="name" placeholder="New collection name" />
        </Col>
        <Col md="2" style={{ maxWidth: "15em" }}>
          <Input type="text" value={newCollection.code} onChange={(e) => handleNewCollectionFormChange(e)} name="code" placeholder="New collection code" />
        </Col>
        <Col md="3" style={{ maxWidth: "15em", marginRight: "20px" }}>
          <Button
            color={newCollection.folio_validated ? "success" : "secondary"}
            onClick={(e) => handleToggleNewCollectionFolioValidation(e)}
          >
            {newCollection.folio_validated ? "Validated against FOLIO" : "Not validated against FOLIO"}
          </Button>
        </Col>
        <Col>
          <Button color="primary" onClick={(e) => handleNewCollectionFormSubmit(e)}>Submit</Button>
        </Col>
      </Row>
    </Form>
  );
};

const DisplayExistingCollections = ({ data, index, handleUpdateFormChange, handleUpdateSubmit, handleToggleUpdateFormFolioValidation, handleDeleteSubmit }) => {
  return (
    <div key={index} style={{paddingBottom: "20px"}}>
      <Row>
        <Col md="4" style={{ maxWidth: "30em" }}>
          <Input type="text" onChange={(e) => handleUpdateFormChange(e, index)} value={data.name} name="name" />
        </Col>
        <Col md="2" style={{ maxWidth: "15em" }}>
          <Input type="text" onChange={(e) => handleUpdateFormChange(e, index)} value={data.code} name="code" />
        </Col>
        <Col md="3" style={{ maxWidth: "15em", marginRight: "20px" }}>
          <Button
            color={data.folio_validated ? "success" : "secondary"}
            onClick={(e) => handleToggleUpdateFormFolioValidation(e, index)}
          >
            {data.folio_validated ? "Validated against FOLIO" : "Not validated against FOLIO"}
          </Button>
        </Col>
        <Col>
          <Button color="primary" style={{"marginRight": "10px"}} onClick={(e) => {handleUpdateSubmit(e, index)}}>Update</Button>
          <Button color="danger" onClick={(e) => {handleDeleteSubmit(e, data)}}>Delete</Button>
        </Col>
      </Row>
    </div>
  );
};
