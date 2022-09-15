import React, {useState, useEffect, useReducer} from 'react'
import { Table, Input, Button, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap'
import Load from '../util/load'
import Alerts from '../components/alerts'
import classnames from 'classnames'
import { CreateAccount } from '../components/login'

function UserManagement(){
    const [users, setUsers] = useState([])
    const [accountType, setAccountType] = useState([])
    const [password, setPassword] = useState('')
    const [type, setType] = useState(0)
    const [activeTab, setActiveTab ] = useState('user_update')

    useEffect(() => {
        getUsers()
        getAccountTypes()
    }, []);

    const toggle = tab => {
        if(activeTab !== tab) setActiveTab(tab);
        getUsers()
    }

    async function getUsers(){
        const search = await Load.getUsers()
        setUsers(search)
    }

    async function getAccountTypes(){
        const search = await Load.accountTypes()
        setAccountType(search)
    }

    const handleSubmit = async (e, index) => {
        const data = users[index]
        const update = await Load.accountUpdate(data)
        if(update){
            Alerts.success('Account successfully updated')
            getUsers()
        } else {
            const errors = {
                name: 'Error updating account',
                message: "There was an error updating this account"
            }
            Alerts.error(errors)
        }
    }

    const updateType = (index, e) => {
        var list = e.nativeEvent.target.selectedIndex;
        const user = users
        user[index].type0.id = e.target.value
        user[index].type0.type = e.nativeEvent.target[list].text
        user[index].type = e.target.value
        setUsers(user)
        setType(e.target.value)
    }

    const updatePassword = (index, e) => {
        const user = users
        user[index].password_field = e.target.value
        setUsers(user)
    }

    const handleDelete = (e, id, email) => {
        e.preventDefault()
        const data = {
            id: id,
            email: email
        }
        const deleteAccount = Load.accountDelete(data)
        if(deleteAccount){
            Alerts.success('Account successfully deleted')
            getUsers()
        } else {
            const errors = {
                name: 'Error deleting account',
                message: "There was an error deleting this account"
            }
            Alerts.error(errors)
        }
    }


    return(
        <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
        <div style={{paddingBottom: '50px'}}>
            <Nav tabs>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'user_update' })}
                        onClick={() => { toggle('user_update'); }}
                    >
                    User Management
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'user_creation' })}
                        onClick={() => { toggle('user_creation'); }}
                    >
                    Create new user
                    </NavLink>
                </NavItem>
            </Nav>
            <br />
            <TabContent activeTab={activeTab}>
                <TabPane tabId="user_update">
                    <UserUpdate
                        users={users}
                        password={password}
                        updatePassword={updatePassword}
                        handleSubmit={handleSubmit}
                        accountType={accountType}
                        updateType={updateType}
                        handleDelete={handleDelete}
                        getUsers={getUsers}
                    />
                </TabPane>
                <TabPane tabId="user_creation">
                    <UserCreation
                        accountType={accountType}
                    />
                </TabPane>
            </TabContent>
        </div>   
        </div> 
    )
}

const UserUpdate = ({ users, password, updatePassword, handleSubmit, updateType, accountType, handleDelete }) => {
    return(
    <Table>
    <thead>
        <tr>
           <th>First Name</th>
           <th>Last Name</th>
           <th>Email</th>
           <th>New Password</th>
           <th>Type</th>
        </tr>    
    </thead>
    <tbody>
        {users && users.length ? Object.keys(users).map((items, index) => 
            <tr key={index}>
                <td>{users[items].first_name}</td>
                <td>{users[items].last_name}</td>
                <td>{users[items].email}</td>
                <td><Input type="password" onChange={e => updatePassword(index, e)} /></td>
                <td><Input type='select' name="type" onChange={e => updateType(index, e)}>
                        {accountType ? Object.keys(accountType).map((set, index) => 
                            <option key={index} selected={users[items].type0.type === accountType[set].type ? 'selected' : ''} value={accountType[set].id}>{accountType[set].type}</option>
                        ): <option></option>}
                 </Input></td>     
                <td><Button color="primary" onClick={(e) => handleSubmit(e, index)}>Update</Button></td>
                <td><Button color="danger" onClick={(e) => handleDelete(e, users[items].id,  users[items].email)}>Delete</Button></td>
            </tr>
        ) : ''} 
    </tbody>        
</Table> 
    )
}

const UserCreation = ({ accountType  }) => {

    const initialState = {
        createNewAccount: {
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            type: ''
          }
    }

    const reducer = (state, action) => {
        switch(action.type){
            case 'CREATE_ACCOUNT':
                const createNewAccount = state.createNewAccount
                createNewAccount[action.payload.name] = action.payload.value
                return {
                    ...state,
                    createNewAccount
                }
            case 'RESET':
                return {
                    ...state,
                    createNewAccount: {
                        email: '',
                        password: '',
                        first_name: '',
                        last_name: '',
                        type: ''
                    }
                }    
            default: 
            throw new Error()    
        }
    }      
    
    const [ state, dispatch ] = useReducer(reducer, initialState)

    const handleCreationChange = e => {
        dispatch({ type: 'CREATE_ACCOUNT', payload: { name: e.target.name, value: e.target.value}})
      }
    
    const handleAccountCreationSubmit = async e => {
        e.preventDefault()
        const data = {
          email: state.createNewAccount.email
        }  
        const account = await Load.verifyAccount(data)
        if(account){
            Alerts.success('This account already exists')
        } else {
          const create = await Load.createAccount(state.createNewAccount)
          if(create){
            dispatch({ type: 'RESET', payload: {}})
            Alerts.success('Account successfully created')
          } else {
            const error = {
              name: 'Account creation',
              message: "There was a problem creating your account."
            }
            Alerts.error(error)
          }
        }   
      }

    return(
        <div>
              <CreateAccount 
                handleAccountCreationSubmit={handleAccountCreationSubmit}
                handleCreationChange={handleCreationChange}
                accountType={accountType}
              />
        </div>    
    )
}

export default UserManagement