import * as ko from "knockout";

ko.bindingHandlers.disabled = {
    update: function (element, valueAccessor) {
        $(element).prop("disabled", ko.unwrap(valueAccessor()));
    }
};
