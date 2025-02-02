import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {Component, onMounted, onWillStart, useRef, useState} from "@odoo/owl";
import {extractFieldsFromArchInfo} from "@web/model/relational_model/utils";
import {ListController} from "@web/views/list/list_controller";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {Dialog} from "@web/core/dialog/dialog";
import {_t} from "@web/core/l10n/translation";

export class TimelineController extends ListController {
    static template = "web_timeline.View";
    static components = {...ListController.components};
    static props = {
        // ...standardViewProps,
        ...ListController.props,
        /*
        AllowSelectors: { type: Boolean, optional: true },
        editable: { type: Boolean, optional: true },
        onSelectionChanged: { type: Function, optional: true },
        showButtons: { type: Boolean, optional: true },
        Model: Function,
        Renderer: Function,
        buttonTemplate: { type: String, optional: true },
        archInfo: Object,
        */
    };

    setup() {
        super.setup();
        this.orm = useService("orm");
        this.uiService = useService("ui");
        this.rootRef = useRef("root");
        this.state = useState({disabled: false});
        this.addDialog = useOwnedDialogs();
        const {activeFields, fields} = extractFieldsFromArchInfo(
            this.props.archInfo,
            this.props.fields
        );
        // The controller create the model and make it reactive so whenever this.model is
        // accessed and edited then it'll cause a rerendering

        // This.set_defaults_orig_timeline_view_init(this.props.archInfo, params)

        const modelServices = Object.fromEntries(
            this.props.Model.services.map((servName) => {
                return [servName, useService(servName)];
            })
        );
        modelServices.orm = useService("orm");
        const config = {
            resModel: this.props.resModel,
            resId: false,
            resIds: [],
            fields,
            activeFields,
            isMonoRecord: true,
            mode: "edit",
            context: this.props.context,
        };
        this.model = useState(new this.props.Model(this.env, {config}, modelServices));
        this.props.model = this.model;

        onMounted(() => {
            this.uiActiveElement = this.uiService.activeElement;
        });

        /*
        This.model = useState(
            new this.props.Model(
                this.orm,
                this.props.resModel,
                this.props.fields,
                this.props.archInfo,
                this.props.domain
            )
        );
        */

        onWillStart(async () => {
            await this.model.load();
        });
    }

    set_defaults_orig_timeline_view_init(viewInfo, params) {
        // This.modelName = this.controllerParams.modelName;
        this.modelName = "project.task";

        const action = params.action;
        this.arch = this.rendererParams.arch;
        const attrs = this.arch.attrs;
        const date_start = attrs.date_start;
        const date_stop = attrs.date_stop;
        const date_delay = attrs.date_delay;
        const dependency_arrow = attrs.dependency_arrow;

        const fields = viewInfo.fields;
        let fieldNames = fields.display_name ? ["display_name"] : [];
        const fieldsToGather = [
            "date_start",
            "date_stop",
            "default_group_by",
            "progress",
            "date_delay",
            attrs.default_group_by,
        ];

        for (const field of fieldsToGather) {
            if (attrs[field]) {
                fieldNames.push(attrs[field]);
            }
        }

        const archFieldNames = _.map(
            _.filter(this.arch.children, (item) => item.tag === "field"),
            (item) => item.attrs.name
        );
        fieldNames = _.union(fieldNames, archFieldNames);

        const colors = this.parse_colors();
        for (const color of colors) {
            if (!fieldNames.includes(color.field)) {
                fieldNames.push(color.field);
            }
        }

        if (dependency_arrow) {
            fieldNames.push(dependency_arrow);
        }

        const mode = attrs.mode || attrs.default_window || "fit";
        const min_height = attrs.min_height || 300;

        /*
        If (!isNullOrUndef(attrs.quick_create_instance)) {
            this.quick_create_instance = "instance." + attrs.quick_create_instance;
        }
        let open_popup_action = false;
        if (
            !isNullOrUndef(attrs.event_open_popup) &&
            utils.toBoolElse(attrs.event_open_popup, true)
        ) {
            open_popup_action = attrs.event_open_popup;
        }
        */
        this.rendererParams.mode = mode;
        this.rendererParams.model = this.modelName;
        this.rendererParams.view = this;
        this.rendererParams.options = this._preapre_vis_timeline_options(attrs);
        // This.rendererParams.can_create = toBoolDefaultTrue(attrs.create);
        // this.rendererParams.can_update = toBoolDefaultTrue(attrs.edit);
        // this.rendererParams.can_delete = toBoolDefaultTrue(attrs.delete);
        this.rendererParams.date_start = date_start;
        this.rendererParams.date_stop = date_stop;
        this.rendererParams.date_delay = date_delay;
        this.rendererParams.colors = colors;
        this.rendererParams.fieldNames = fieldNames;
        this.rendererParams.default_group_by = attrs.default_group_by;
        this.rendererParams.min_height = min_height;
        this.rendererParams.dependency_arrow = dependency_arrow;
        this.rendererParams.fields = fields;
        this.loadParams.modelName = this.modelName;
        this.loadParams.fieldNames = fieldNames;
        this.loadParams.default_group_by = attrs.default_group_by;
        // This.controllerParams.open_popup_action = open_popup_action;
        this.controllerParams.date_start = date_start;
        this.controllerParams.date_stop = date_stop;
        this.controllerParams.date_delay = date_delay;
        this.controllerParams.actionContext = action.context;
        this.withSearchPanel = false;
    }

    /**
     * Gets triggered when a group in the timeline is
     * clicked (by the TimelineRenderer).
     *
     * @private
     * @param {EventObject} event
     * @returns {jQuery.Deferred}
     */
    _onGroupClick(event) {
        const groupField = this.renderer.last_group_bys[0];
        return this.do_action({
            type: "ir.actions.act_window",
            res_model: this.renderer.fields[groupField].relation,
            res_id: event.data.item.group,
            target: "new",
            views: [[false, "form"]],
        });
    }

    /**
     * Triggered on double-click on an item in read-only mode (otherwise, we use _onUpdate).
     *
     * @private
     * @param {EventObject} event
     * @returns {jQuery.Deferred}
     */
    _onItemDoubleClick(event) {
        return this.openItem(event.data.item, false);
    }

    /**
     * Opens a form view of a clicked timeline
     * item (triggered by the TimelineRenderer).
     *
     * @private
     * @param {EventObject} event
     */
    _onUpdate(event) {
        const item = event.data.item;
        const item_id = Number(item.evt.id) || item.evt.id;
        return this.openItem(item_id, true);
    }

    /** Open specified item, either through modal, or by navigating to form view. */
    openItem(item_id, is_editable) {
        if (this.open_popup_action) {
            const options = {
                resModel: this.model.modelName,
                resId: item_id,
                context: this.getSession().user_context,
            };
            if (is_editable) {
                options.onRecordSaved = () => this.write_completed();
            } else {
                options.preventEdit = true;
            }
            this.Dialog = Component.env.services.dialog.add(
                FormViewDialog,
                options,
                {}
            );
        } else {
            this.trigger_up("switch_view", {
                view_type: "form",
                model: this.model.modelName,
                res_id: item_id,
                mode: is_editable ? "edit" : "readonly",
            });
        }
    }

    /**
     * Gets triggered when a timeline item is
     * moved (triggered by the TimelineRenderer).
     *
     * @private
     * @param {EventObject} event
     */
    _onMove(event) {
        const item = event.data.item;
        // Const fields = this.renderer.fields;
        const event_start = item.start;
        const event_end = item.end;
        let group = false;
        if (item.group !== -1) {
            group = item.group;
        }
        const data = {};
        // In case of a move event, the date_delay stay the same,
        // only date_start and stop must be updated
        /*
        data[this.date_start] = time.auto_date_to_str(
            event_start,
            fields[this.date_start].type
        );
        if (this.date_stop) {
            // In case of instantaneous event, item.end is not defined
            if (event_end) {
                data[this.date_stop] = time.auto_date_to_str(
                    event_end,
                    fields[this.date_stop].type
                );
            } else {
                data[this.date_stop] = data[this.date_start];
            }
        }
        */
        if (this.date_delay && event_end) {
            const diff_seconds = Math.round(
                (event_end.getTime() - event_start.getTime()) / 1000
            );
            data[this.date_delay] = diff_seconds / 3600;
        }
        const grouped_field = this.renderer.last_group_bys[0];
        this._rpc({
            model: this.modelName,
            method: "fields_get",
            args: [grouped_field],
            context: this.getSession().user_context,
        }).then(async (fields_processed) => {
            if (
                this.renderer.last_group_bys &&
                this.renderer.last_group_bys instanceof Array &&
                fields_processed[grouped_field].type !== "many2many"
            ) {
                data[this.renderer.last_group_bys[0]] = group;
            }

            this.moveQueue.push({
                id: event.data.item.id,
                data: data,
                event: event,
            });

            this.debouncedInternalMove();
        });
    }

    /**
     * Write enqueued moves to Odoo. After all writes are finished it updates
     * the view once (prevents flickering of the view when multiple timeline items
     * are moved at once).
     *
     * @returns {jQuery.Deferred}
     */
    internalMove() {
        const queues = this.moveQueue.slice();
        this.moveQueue = [];
        const defers = [];
        for (const item of queues) {
            defers.push(
                this._rpc({
                    model: this.model.modelName,
                    method: "write",
                    args: [[item.event.data.item.id], item.data],
                    context: this.getSession().user_context,
                }).then(() => {
                    item.event.data.callback(item.event.data.item);
                })
            );
        }
        return $.when.apply($, defers).done(() => {
            this.write_completed({
                adjust_window: false,
            });
        });
    }

    /**
     * Triggered when a timeline item gets removed from the view.
     * Requires user confirmation before it gets actually deleted.
     *
     * @private
     * @param {EventObject} event
     * @returns {jQuery.Deferred}
     */
    _onRemove(event) {
        var def = $.Deferred();

        Dialog.confirm(this, _t("Are you sure you want to delete this record?"), {
            title: _t("Warning"),
            confirm_callback: () => {
                this.remove_completed(event).then(def.resolve.bind(def));
            },
            cancel_callback: def.resolve.bind(def),
        });

        return def;
    }

    /**
     * Triggered when a timeline item gets added and opens a form view.
     *
     * @private
     * @param {EventObject} event
     * @returns {dialogs.FormViewDialog}
     */
    _onAdd(event) {
        const item = event.data.item;
        // Initialize default values for creation
        const default_context = {};
        default_context["default_".concat(this.date_start)] = item.start;
        if (this.date_delay) {
            default_context["default_".concat(this.date_delay)] = 1;
        }
        if (this.date_start) {
            default_context["default_".concat(this.date_start)] = moment(item.start)
                .utc()
                .format("YYYY-MM-DD HH:mm:ss");
        }
        if (this.date_stop && item.end) {
            default_context["default_".concat(this.date_stop)] = moment(item.end)
                .utc()
                .format("YYYY-MM-DD HH:mm:ss");
        }
        if (this.date_delay && this.date_start && this.date_stop && item.end) {
            default_context["default_".concat(this.date_delay)] =
                (moment(item.end) - moment(item.start)) / 3600000;
        }
        if (item.group > 0) {
            default_context["default_".concat(this.renderer.last_group_bys[0])] =
                item.group;
        }
        // Show popup
        this.Dialog = Component.env.services.dialog.add(
            FormViewDialog,
            {
                resId: false,
                context: _.extend(default_context, this.context),
                onRecordSaved: (record) => this.create_completed([record.resId]),
                resModel: this.model.modelName,
            },
            {onClose: () => event.data.callback()}
        );
        return false;
    }

    /**
     * Triggered upon completion of a new record.
     * Updates the timeline view with the new record.
     *
     * @param {RecordId} id
     * @returns {jQuery.Deferred}
     */
    create_completed(id) {
        return this._rpc({
            model: this.model.modelName,
            method: "read",
            args: [id, this.model.fieldNames],
            context: this.context,
        }).then((records) => {
            var new_event = this.renderer.event_data_transform(records[0]);
            var items = this.renderer.timeline.itemsData;
            items.add(new_event);
        });
    }

    /**
     * Triggered upon completion of writing a record.
     * @param {ControllerOptions} options
     */
    write_completed(options) {
        const params = {
            domain: this.renderer.last_domains,
            context: this.context,
            groupBy: this.renderer.last_group_bys,
        };
        this.update(params, options);
    }

    /**
     * Triggered upon confirm of removing a record.
     * @param {EventObject} event
     * @returns {jQuery.Deferred}
     */
    remove_completed(event) {
        return this._rpc({
            model: this.modelName,
            method: "unlink",
            args: [[event.data.item.id]],
            context: this.getSession().user_context,
        }).then(() => {
            let unlink_index = false;
            for (var i = 0; i < this.model.data.data.length; i++) {
                if (this.model.data.data[i].id === event.data.item.id) {
                    unlink_index = i;
                }
            }
            if (!isNaN(unlink_index)) {
                this.model.data.data.splice(unlink_index, 1);
            }
            event.data.callback(event.data.item);
        });
    }
}
