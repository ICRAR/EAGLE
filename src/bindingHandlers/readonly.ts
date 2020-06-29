import * as ko from "knockout";

ko.bindingHandlers.readonly = {
    update: function (element, valueAccessor) {
        $(element).prop("readonly", ko.unwrap(valueAccessor()));
    }
};
