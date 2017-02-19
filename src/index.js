import React from 'react';
import ReactDOM from 'react-dom';
import TodoListContainer from './todo_list_container';
import './index.css';
import {createStore, applyMiddleware} from 'redux';
import {Provider} from 'react-redux'
import AddItemContainer from './add_item_container';
import thunk from 'redux-thunk';


const reducer = (state = {todos: []}, action) => {
    if(action.type === 'add_item') {
      state = {...state, todos: state.todos.concat(action.value)}
    }
    return state;
};

let store = createStore(reducer, applyMiddleware(thunk));

ReactDOM.render(
  (
   <Provider store={store}>
    <div>
        <AddItemContainer />
        <TodoListContainer />
    </div>
   </Provider>
   ),
  document.getElementById('root')
);
