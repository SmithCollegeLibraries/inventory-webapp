import React from 'react'
import { Form, FormGroup, Input, Label, Button } from 'reactstrap'

import SISLogo from '../image/sis-logo.png'
import '../css/login.css'

export const LoginPage = ({ handleLoginChange, handleLoginSubmit, state }) => (
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

export const CreateAccount = ({ handleAccountCreationSubmit, handleCreationChange, loginPage }) => (
  <div>
  <Form className="form-signin">
    <FormGroup>
      <Label for="email">Email address</Label>
      <Input type="email" pattern="/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/" name="email" onChange={(e) => handleCreationChange(e)} required autoFocus />
    </FormGroup>
    <FormGroup>
      <Label for="password">Password</Label>
      <Input type="password" name="password" onChange={(e) => handleCreationChange(e)} required />
    </FormGroup>
    <FormGroup>
      <Label for="name">Name</Label>
      <Input type="text" name="name" onChange={(e) => handleCreationChange(e)} required />
    </FormGroup>
    <FormGroup>
      <Label for="level">Level</Label>
      <Input type="number" name="level" min="0" max="100" onChange={e => handleCreationChange(e)} required />
    </FormGroup>
    <Button color="primary" className="btn-block" onClick={(e) => handleAccountCreationSubmit(e)} type="submit">Create account</Button>
  </Form>
  </div>
)
