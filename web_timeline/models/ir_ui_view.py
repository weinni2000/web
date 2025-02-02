# Copyright 2016 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models

TIMELINE_VIEW = ("timeline", "Timeline")


class IrUIView(models.Model):
    _inherit = "ir.ui.view"

    type = fields.Selection(selection_add=[TIMELINE_VIEW])

    def _get_view_info(self):
        view_info = super()._get_view_info()
        view_info["timeline"] = {
            "icon": "fa fa-globe",
        }
        return view_info
