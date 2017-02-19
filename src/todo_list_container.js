import {connect} from 'react-redux';
import TodoList from './todo_list';

const mapStateToProps = (state) => {return {todos: state.todos}};

const TodoListContainer = connect(mapStateToProps)(TodoList);

export default TodoListContainer;
