import React from 'react';

const AddItem = ({addItem}) => {
    let input;
    return (
        <div>
            <input ref={node => {input = node}} />
            <button onClick={() => { addItem(input)}}>Add </button>
        </div>
    );
}

export default AddItem;