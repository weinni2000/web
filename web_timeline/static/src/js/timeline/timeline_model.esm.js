import {KeepLast} from "@web/core/utils/concurrency";

export class TimelineModel {
    constructor(orm, resModel, fields, archInfo, domain) {
        this.orm = orm;
        this.resModel = resModel;
        // We can access arch information parsed by the beautiful arch parser
        const {fieldFromTheArch} = archInfo;
        this.fieldFromTheArch = fieldFromTheArch;
        this.fieldsFromTheArch = ["name"];
        this.fields = fields;
        this.domain = domain;
        this.keepLast = new KeepLast();
    }

    async load() {
        // The keeplast protect against concurrency call
        const {length, records} = await this.keepLast.add(
            this.orm.webSearchRead(this.resModel, this.domain, {
                specification: {
                    name: {},
                    // Description: {},
                },
            })
        );
        this.records = records;
        this.recordsLength = length;
    }
}
