import AddItem from './add_item';
import {connect} from 'react-redux';
import {saveItem} from './actions';

const mapDispatchToProps = (dispatch) => {
    return {
        addItem: (input) =>  {
            dispatch(saveItem(input.value));
            input.value="";
        }
    }
}
const AddItemContainer = connect(() => {return {}}, mapDispatchToProps)(AddItem)
export default AddItemContainer;