import React, { useReducer, useEffect } from 'react';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import { Row, Col, Form, Button, Input, Card, CardBody } from 'reactstrap';


function ManageTrays(props) {
  const initialState = {
    trays: [],
    tray: ''
  };

  const trayReducer = (state, action) => {
    switch (action.type) {
      case 'ADD_TRAYS':
        return {
          ...state,
          trays: action.trays
        };
      case 'UPDATE_TRAY_FORM':
        return {
          ...state,
          tray: action.trays
        };
      case 'UPDATE_TRAYS':
        return {
          ...state,
          trays: action.trays
        };
      default:
        return state;
    }
  };

  const [data, dispatch] = useReducer(trayReducer, initialState);

  useEffect(() => {
    trays()
  }, []);

  const trays = async () => {
    const trays = await Load.viewAllTrays();
    dispatch({ type: "ADD_TRAYS", trays: trays});
  };

  const handleFormChange = (e) => {
    dispatch({ type: "UPDATE_TRAY_FORM", trays: e.target.value});
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const createData = {
      'barcode' : data.tray
    };
    const results = await Load.createNewTray(createData);
    if (results) {
      success("New tray successfully created");
      dispatch({ type: "UPDATE_TRAY_FORM", trays: ""});
      trays();
      props.newTrays();
    } else {
      failure("Unable to create tray");
    }
  };

  const handleUpdateFormChange = (e, key) => {
    const tray = data.trays;
    tray[key]["barcode"] = e.target.value;
    dispatch({ type: "UPDATE_TRAYS", trays: tray});
  };

  const handleUpdateSubmit = async(e, key) => {
    const update = await Load.updateTray(data.trays[key]);
    if (update) {
      success('Trays updated');
    } else {
      failure("There was a problem updating this tray");
    }
    trays();
    props.newTrays();
  };

  const handleDeleteSubmit = async(e, data) => {
    e.preventDefault();
    const hasItems = await Load.trayHasItems(data);
    if (hasItems) {
      failure("This tray cannot be deleted because it has items tied to it");
    } else {
      if (window.confirm("Delete this tray? This action can only be undone by the database administrator.")) {
        const set = await Load.deleteTray({id: data.id});
        if (set) {
          success('Tray removed');
        } else {
          failure('Tray could not be removed');
        }
      }
    }
    trays();
    props.newTrays();
  };

  return (
    <div>
      <div style={{backgroundColor: "#fff", padding: '20px', textAlign: "middle", marginTop: "20px"}}>
        <DisplayForm
          handleFormChange={handleFormChange}
          handleFormSubmit={handleFormSubmit}
          tray={data.tray}
        />
      </div>
      <Card>
        <CardBody>
          {Object.keys(data.trays).map((items, idx) => {
            return (
              <Display
                data={data.trays[items]}
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

export default ManageTrays;

const DisplayForm = ({ handleFormChange, handleFormSubmit, tray }) => (
  <Form onSubmit={(e) => handleFormSubmit(e)}>
    {/* <Row>
      <Col md="8">
        <Input type="text" value={tray} onChange={(e) => handleFormChange(e)} name="tray" placeholder="Add a new tray..." />
      </Col>
      <Col md="2">
        <Button color="primary">Submit</Button>
      </Col>
    </Row> */}
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
