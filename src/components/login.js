import React from 'react'
import { Form, FormGroup, Input, Label, InputGroup, Button } from 'reactstrap'

import SISLogo from '../image/sis-logo.png'
import '../css/login.css'

export const LoginPage = ({ handleLoginChange, handleLoginSubmit, handleCreateNewPage, state }) => (
    <div className="login-form">
    <Form className="form-signin">
        <div className="text-center mb-4">
            <img className="mb-4" src={SISLogo} alt="SIS Logo" width="172" height="172"/>
        </div>
        <FormGroup>
            <Label for="email">Email Address</Label>
            <Input type="email" name="email" value={state.email} onChange={(e) => handleLoginChange(e)} placeholder="email address" required autoFocus />
        </FormGroup>
        <FormGroup>
            <Label for="password">Password</Label>
            <Input type="password" name="password" value={state.password} onChange={(e) => handleLoginChange(e)} placeholder="password" required />
        </FormGroup>
        <Button color="primary" className="btn-block" onClick={(e) => handleLoginSubmit(e)} type="submit">Login</Button>{ ' '}
        {/* <Button color="primary" className="btn-block" onClick={(e) => handleCreateNewPage(e)} type="submit">Create new account</Button> */}
    </Form>
    </div>
)

export const CreateAccount = ({ handleAccountCreationSubmit, handleCreationChange, loginPage, accountType }) => (
    <div>
    <Form className="form-signin">
        <FormGroup>
            <Label for="email">Email Address</Label>
            <Input type="email" pattern="/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/" name="email" onChange={(e) => handleCreationChange(e)} placeholder="email address" required autoFocus />
        </FormGroup>
        <FormGroup>
            <Label for="password">Password</Label>
            <Input type="password" name="password" onChange={(e) => handleCreationChange(e)} placeholder="password" required />
        </FormGroup>
        <FormGroup>
            <Label for="password">First Name</Label>
            <Input type="text" name="first_name" onChange={(e) => handleCreationChange(e)} required />
        </FormGroup>
        <FormGroup>
            <Label for="password">Last Name</Label>
            <Input type="text" name="last_name" onChange={(e) => handleCreationChange(e)} required />
        </FormGroup>
        <FormGroup>
        <Input type='select' name="type" onChange={e => handleCreationChange(e)}>
            <option value="">Select user type..</option>
            {accountType ? Object.keys(accountType).map((set, index) => 
                <option key={index} value={accountType[set].id}>{accountType[set].type}</option>
            ): <option></option>}
        </Input>
        </FormGroup>
        <Button color="primary" className="btn-block" onClick={(e) => handleAccountCreationSubmit(e)} type="submit">Create Account</Button>   
    </Form>
    </div>
)