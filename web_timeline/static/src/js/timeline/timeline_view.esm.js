/** @odoo-module **/
import {RelationalModel} from "@web/model/relational_model/relational_model";
import {registry} from "@web/core/registry";
import {TimelineRenderer} from "./timeline_renderer/timeline_renderer";
import {TimelineController} from "./timeline_controller/timeline_controller";
import {TimelineArchParser} from "./timeline_arch_parser";

export const timelineView = {
    type: "timeline",
    Controller: TimelineController,
    Renderer: TimelineRenderer,
    ArchParser: TimelineArchParser,
    Model: RelationalModel, // TimelineModel, //, //, //,
    canOrderByCount: true,

    limit: 80,

    props: (genericProps, view) => {
        const {ArchParser} = view;
        const {arch, relatedModels, resModel} = genericProps;
        const archInfo = new ArchParser().parse(arch, relatedModels, resModel);

        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            buttonTemplate: view.buttonTemplate,
            archInfo,
        };
    },

    /**
     * Function that returns the props for the grid view.
     * @param {Object} genericProps - Generic properties of the view.
     * @param {Object} view - The view object.
     * @returns {Object} Props for the grid view.
     */

    /*
    props: (genericProps, view) => {
        const {
            ArchParser,
            Model,
            Renderer
        } = view;
        const {
            arch,
            relatedModels,
            resModel
        } = genericProps;
        const archInfo = new ArchParser().parse(arch, relatedModels, resModel);
        return {
            ...genericProps,
            archInfo,
            Model: view.Model,
            Renderer,
        };
    }
    */

    _preapre_vis_timeline_options(attrs) {
        return {
            groupOrder: "order",
            orientation: {axis: "both", item: "top"},
            selectable: true,
            multiselect: true,
            showCurrentTime: true,
            // Stack: toBoolDefaultTrue(attrs.stack),
            margin: attrs.margin ? JSON.parse(attrs.margin) : {item: 2},
            zoomKey: attrs.zoomKey || "ctrlKey",
        };
    },

    /**
     * Parse the colors attribute.
     *
     * @private
     * @returns {Array}
     */
    parse_colors() {
        if (this.arch.attrs.colors) {
            return _(this.arch.attrs.colors.split(";"))
                .chain()
                .compact()
                .map((color_pair) => {
                    const pair = color_pair.split(":");
                    const color = pair[0];
                    // Const expr = pair[1];
                    // Const temp = py.parse(py.tokenize(expr)); // not clear how to translate to OWL2
                    return {
                        color: color,
                        // Field: temp.expressions[0].value,
                        // opt: temp.operators[0],
                        // value: temp.expressions[1].value,
                    };
                })
                .value();
        }
        return [];
    },
};
registry.category("views").add("timeline", timelineView);
