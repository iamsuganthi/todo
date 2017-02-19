const addItem = (value) => {
    return {
        type: 'add_item', value
    };
}

export const saveItem = (value) => {
    return (dispatch) => {
        fetch("http://mockbin.org/bin/45750e6a-334a-4384-9983-829fe25eb458",
        {
            method: "POST",
            mode: 'no-cors',
            body: value
        });
        return dispatch(addItem(value));
    }
}