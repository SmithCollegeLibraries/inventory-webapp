import React, { Component } from 'react'
import ContentSearch from '../util/search'
import Load from '../util/load'
import Alerts from '../components/alerts'
import {getFormattedDate} from '../util/date'
import { Col, Row, Form, Input, Button, FormGroup, Label } from 'reactstrap'
import ReactTable from 'react-table'
import { success, failure, warning } from '../components/toastAlerts'
import FoldableTableHOC from "react-table/lib/hoc/foldableTable";
import 'react-table/react-table.css'

const FoldableTable = FoldableTableHOC(ReactTable);

export default class ManageShelves extends Component {
    state = {
        loading: false,
        data: [],
        collections: this.props.collections,
        collapse: false,
        updated: false,
        shelf: ''
    }


    handleSearch = async e => {
        e.preventDefault()
        this.setState({ loading: true })
        const search = await ContentSearch.shelfmanagement(this.state.shelf)
        if(search && !search.length){ Alerts.info('No search results found')}
        this.setState({
            data: search ? search : [],
            loading: false
        })
    }

    handleFormChange = e => {
        this.setState({
            [e.target.name]: e.target.value
        })
    }

    handleShelfUpdateChange = (e, key) => {
        const { data } = this.state
        data[key][e.target.name] = e.target.value
        this.setState({
            data
        })
    }

    handleUpdate = (key, data) => {
        const results = this.state.searchResults
        results[key] = data
        this.setState({ results })
    }

    // updateItem = (e, key) => {
    //   e.preventDefault()
    //   const data = this.state.data[key]
    //   const results = Load.updateShelf(data, data.id)
    //   if(results){
    //     success(`${data.shelf} updated successfully`)
    //     this.handleSearch(e)
    //   } else {
    //     failure(`There was an error updating shelf ${data.shelf}` )
    //   }
    // }

    // handleDelete = (e, index, value ) =>{
    //     this.setState((prevState) => ({
    //       data: prevState.data.filter((_, i) => i != index)
    //     }), async () => {
    //       const results = await Load.deleteShelf(value.original)
    //       if(results){
    //         success(`${value.original.boxbarcode} was succesfully deleted from ${value.original.shelf}`)
    //       } else {
    //         failure(`There was an error deleting shelf ${value.original.boxbarcode} from ${value.original.shelf}` )
    //       }
    //   })
    // }


    render(){
        const { shelf, data, loading } = this.state
        return(
          <div>
              <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
                <ShelfForm
                    handleSearch={this.handleSearch}
                    handleFormChange={this.handleFormChange}
                    shelf={shelf}
                />
                </div>
                <br />
                <ShelfDisplay
                    data={data}
                    loading={loading}
                    handleShelfUpdateChange={this.handleShelfUpdateChange}
                    updateItem={this.updateItem}
                    handleDelete={this.handleDelete}
                />
          </div>
        )
      }
}

const ShelfForm = ({ handleSearch, handleFormChange, shelf }) => (
    <Form inline onSubmit={(e) => handleSearch(e)}>
        <FormGroup className="mb-2 mr-sm-2 mb-sm-0">
            <Label className="mr-sm-2">Shelf Search (Example 10R2001)</Label>
            <Input type="text" name="shelf" value={shelf} onChange={(e) => handleFormChange(e)} />
        </FormGroup>
        <Button color="primary">Search</Button>
    </Form>
)

const ShelfDisplay = ({ data, loading, handleShelfUpdateChange, updateItem, handleDelete }) => (
    <FoldableTable
        data={data}
        columns={
        [{
            Header: "Tray Barcode",
            accessor: "boxbarcode",
            id: "boxbarcode",
            foldable: true,
            Cell: function(props){
                return(
                <FormGroup>
                    <Input value={props.value} onChange={(e) => handleShelfUpdateChange(e, props.index)} type="text" name="boxbarcode" />
                </FormGroup>
                )
            }
        },{
            Header: "Shelf Barcode",
            accessor: "shelf",
            id: "shelf",
            foldable: true,
            Cell: function(props){
                return(
                    <FormGroup>
                        <Input value={props.value} onChange={(e) => handleShelfUpdateChange(e, props.index)} type="text" name="shelf" />
                    </FormGroup>
                )
            }
        },{
            Header: "Shelf Depth",
            accessor: "shelf_depth",
            id: "shelf_depth",
            foldable: true,
            Cell: function(props){
                return(
                    <FormGroup>
                        <Input type="select" value={props.value} onChange={(e) => handleShelfUpdateChange(e, props.index)} name="shelf_depth">
                            <option>Select Depth</option>
                            <option>Front</option>
                            <option>Middle</option>
                            <option>Rear</option>
                        </Input>
                    </FormGroup>
                )
            }
        },{
            Header: "Shelf Position",
            accessor: "shelf_position",
            id: "shelf_position",
            foldable: true,
            Cell: function(props){
                return(
                    <FormGroup>
                        <Input type="select" value={props.value} onChange={(e) => handleShelfUpdateChange(e, props.index)} name="shelf_position">
                        {[...Array(12)].map((x, i) =>
                            <option key={i} value={i + 1}>{i + 1}</option>
                        )}
                        </Input>
                    </FormGroup>
                )
            }
        },{
            Header: "Added",
            accessor: "added",
            id: "added",
            foldable: true
        },{
            Header: "Last Updated",
            accessor: "timestamp",
            id: "timestamp",
            foldable: true
        },{
            Header: 'Options',
            accessor: 'button',
            foldable: true,
            Cell: function(props){
                    return (
                        <span>
                            <Button color="warning" onClick={(e) => updateItem(e, props.index)}>Update</Button>{' '}
                            <Button color="danger" onClick={(e) => {if(window.confirm('Are you sure you want to delete this item?')) {handleDelete(e, props.index, props)}}}>Delete</Button>
                        </span>
                    )
            },
        },
    ]
    }
    showPagination={false}
    pageSize={data.length}
    filterable={true}
    loading={loading}
/>
)

class ShelfAllSearch extends Component {

    handleSearch = (e) => {
        e.preventDefault();
        this.props.handleShelfSearch(this.shelf.value.trim())
    }


    render(){
      return(
        <form id="search_shelf" name="search_shelf"
              onSubmit={(e) => this.handleSearch(e)}>
            <fieldset>
                <div className="form-group">
                    <label>Shelf (Example 10R2001)</label>
                        <input ref={(input) => this.shelf = input} className="form-control" id="shelf"
                               name="shelf" placeholder="Shelf search"/>
                </div>
            </fieldset>
            <button id="submit" type="submit" className="btn btn-primary">Search</button>
        </form>
      )
    }
  }


class ShelfAllEdit extends Component {


    handleChange = (e, key, index) => {
        const values = {
          ...this.props.data[key],
          [e.currentTarget.name]: e.currentTarget.value,
          timestamp: getFormattedDate()
        }

        this.props.handleUpdate(index, values)
    }

    updateItem = (key, id, index) => {
        this.props.updateItem(key, id, index)
    }

    renderDisplay = (key, index) => {
      const data = this.props.data[key]
      let options = []
      for(let i = 1; i <= 10; i++){
        options.push(<option key={i} value={i}>{i}</option>)
      }
      return(
        <div className="card" key={key}>
          <div className="card-body">
            <dl className="row" key={key}>
              <dt className="col-sm-3">Id</dt>
              <dd className="col-sm-9">
                <input className="form-control" disabled value={data.id}
                  name="id" placeholder="ID"
                  onChange={(e) => this.handleChange(e, key, index)}/>
              </dd>
              <dt className="col-sm-3">Tray Barcode</dt>
              <dd className="col-sm-9">
                <input className="form-control" value={data.boxbarcode}
                  name="boxbarcode" placeholder="Box Barcode"
                  onChange={(e) => this.handleChange(e, key, index)}/>
              </dd>
              <dt className="col-sm-3">Shelf</dt>
              <dd className="col-sm-9">
                <input className="form-control" value={data.shelf}
                  name="shelf" placeholder="Shelf"
                  onChange={(e) => this.handleChange(e, key, index)}/>
              </dd>
              <dt className="col-sm-3">Depth</dt>
              <dd className="col-sm-9">
                <select className="form-control" value={data.shelf_depth}
                  onChange={(e) => this.handleChange(e, key, index)} name="shelf_depth">
                  <option value="Front">Front</option>
                  <option value="Middle">Middle</option>
                  <option value="Rear">Rear</option>
                </select>
              </dd>
              <dt className="col-sm-3">Position</dt>
              <dd className="col-sm-9">
                <select className="form-control" value={data.shelf_position}
                  onChange={(e) => this.handleChange(e, key, index)} name="shelf_position">
                  {options}
                </select>
              </dd>
              <dt className="col-sm-3">Added</dt>
              <dd className="col-sm-9">
               <input className="form-control" disabled value={data.added} />
              </dd>
              <dt className="col-sm-3">Updated</dt>
              <dd className="col-sm-9">
               <input className="form-control" disabled value={data.timestamp} />
            </dd>
            <dt className="col-sm-3"></dt>
            <dd className="col-sm-9 d-flex justify-content-end" style={{marginTop: '20px'}}>
            <div className="btn-group" role="group" aria-label="Option buttons">
              <button className="btn btn-primary" style={{marginRight: '10px'}} onClick={(e) => this.props.updateItem(e, key, data.id, index)}>Update</button>
              <button className="btn btn-danger" style={{marginRight: '10px'}} onClick={(e) => {if(window.confirm('Delete this item?')) {this.props.handleDelete(e, key, data.id, index)}}}>Delete</button>
            </div>
            </dd>
          </dl>
        </div>
       </div>
      )
    }


    render(){
      const data = this.props.data
      return(
        <div>
        {
          Object
          .keys(this.props.data)
          .map(this.renderDisplay)
        }
      </div>
      )
    }
  }