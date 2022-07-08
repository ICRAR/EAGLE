import * as ko from "knockout";

ko.bindingHandlers.eagleChecked = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext : ko.BindingContext) {
        $(element).click(function() {
            var value = valueAccessor();
            const checked = $(element).prop("checked").toString();
            console.log("init checked", checked, typeof checked);

            value(checked);
        });
    },
    update: function (element, valueAccessor) {
        const checked = ko.unwrap(valueAccessor());
        console.log("update checked", checked, typeof checked);

        $(element).attr("checked", checked.toLowerCase());
        $(element).prop("checked", checked.toLowerCase() === true);
    }
};
