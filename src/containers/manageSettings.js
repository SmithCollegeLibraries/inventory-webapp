import React, { useEffect } from 'react';
import Load from '../util/load';
import { success, failure } from '../components/toastAlerts';
import { Row, Col, Form, Button, Input, Card, CardBody } from 'reactstrap';
import { create } from 'zustand';


const useSettings = create((set) => {
  return {
    settings: {},
    newSettingName: "",
    newSettingValue: "",

    updateAllSettings: (settings) => set({ settings }),
    updateNewSettingName: (newSettingName) => set({ newSettingName }),
    updateNewSettingValue: (newSettingValue) => set({ newSettingValue }),
    updateSetting: (settingName, settingValue) => set((state) => {
      let settings = state.settings;
      settings[settingName] = settingValue;
      return { settings };
    }),
  }
});


function ManageSettings() {
  const state = useSettings();

  // Get settings from database on load
  useEffect(() => {
    const getSettings = async () => {
      const settings = await Load.getAllSettings();
      state.updateAllSettings(settings);
    };
    getSettings();
  }, []);

  // Handle new setting input change
  const handleNewSettingChange = (e) => {
    const { name, value } = e.target;
    if (name === "new_setting_name") {
      state.updateNewSettingName(value.replace(/[^a-zA-Z]/g, "").replace(/^./, (char) => char.toLowerCase()));
    }
    else if (name === "new_setting_value") {
      state.updateNewSettingValue(value);
    }
  };

  // Handle new setting submission
  const handleNewSettingSubmit = async (e) => {
    e.preventDefault();
    // If setting name is empty, show error
    if (state.newSettingName === "") {
      failure("Setting name cannot be empty");
    }
    // If setting name already exists in list, show error
    if (state.settings[state.newSettingName]) {
      failure("Setting name already exists");
    }
    else {
      // Otherwise, create new setting
      const newSettingData = {
        name: state.newSettingName,
        value: state.newSettingValue
      };

      const response = await Load.newSetting(newSettingData);
      if (response) {
        success("New setting created successfully");
        state.updateNewSettingName("");
        state.updateNewSettingValue("");
        const settings = await Load.getAllSettings();
        state.updateAllSettings(settings);
      }
    }
  };

  // Handle updating a setting
  const handleUpdateSetting = (e, settingName) => {
    const newValue = e.target.value;
    state.updateSetting(settingName, newValue);
  };

  // Handle updating a setting submission
  const handleUpdateSubmit = async (e, settingName) => {
    e.preventDefault();
    const settingValue = state.settings[settingName];

    // Update the setting in the database
    const response = await Load.updateSetting({
      name: settingName,
      value: settingValue,
    });
    if (response) {
      success("Setting updated successfully");
      const settings = await Load.getAllSettings();
      state.updateAllSettings(settings);
    }
  };

  return (
    <div>
      <div style={{backgroundColor: "#fff", padding: '20px', textAlign: "middle", marginTop: "20px"}}>
        <AddNewSetting
          handleNewSettingChange={handleNewSettingChange}
          handleNewSettingSubmit={handleNewSettingSubmit}
          newSettingName={state.newSettingName}
          newSettingValue={state.newSettingValue}
        />
      </div>
      <Card>
        <CardBody>
          {state.settings ? Object.keys(state.settings).map((item, idx) => {
            return (
              <SettingDisplay
                settingName={item}
                settingValue={state.settings[item]}
                index={idx}
                handleUpdateSetting={handleUpdateSetting}
                handleUpdateSubmit={handleUpdateSubmit}
              />
            );
          }) : null}
        </CardBody>
      </Card>
    </div>
  );

}

export default ManageSettings;

const AddNewSetting = ({ handleNewSettingChange, handleNewSettingSubmit, newSettingName, newSettingValue }) => (
  <Form autoComplete="off" onSubmit={(e) => handleNewSettingSubmit(e)}>
    <Row>
      <Col md="4">
        <Input type="text" value={newSettingName} onChange={(e) => handleNewSettingChange(e)} name="new_setting_name" placeholder="newSettingName" />
      </Col>
      <Col md="4">
        <Input type="text" value={newSettingValue} onChange={(e) => handleNewSettingChange(e)} name="new_setting_value" placeholder="New setting value" />
      </Col>
      <Col md="2">
        <Button color="primary">Submit</Button>
      </Col>
    </Row>
  </Form>
);

const SettingDisplay = ({ settingName, settingValue, index, handleUpdateSetting, handleUpdateSubmit }) => {
  return (
    <div key={index} style={{paddingBottom: "20px"}}>
      <Row>
        <Col md="4">
          <Input type="text" value={settingName} name="name" readOnly />
        </Col>
        <Col md="4">
          <Input type="text" onChange={(e) => handleUpdateSetting(e, settingName)} value={settingValue} name="value" />
        </Col>
        <Col md="2">
          <Button color="primary" style={{"marginRight": "10px"}} onClick={(e) => {handleUpdateSubmit(e, settingName)}}>Update</Button>
        </Col>
      </Row>
    </div>
  )
};
