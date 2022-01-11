/**
 * 
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

class SteinbockWidget {
    constructor() {
        this.today = this.getDate();
        this.isHoliday = Tools.isHoliday(this.today);
        this.parameters = this.parseParameters();
        this.widgetFamily = 0;
        this.dataAggregation = 3;
    }
 
    async run() {
        let widget = await this.createWidget()
        if (!config.runsInWidget) {
            await widget.presentSmall()
        }
        Script.setWidget(widget)
        Script.complete()
    }
 
    async createWidget(items) {
        this.currentUtilization = await this.getCurrentUtilization();
        this.utilizationHistory = await this.getUtilizationHistory();

        let listWidget = new ListWidget();
        listWidget.setPadding(10, 0, 0, 0);
        listWidget.backgroundColor = Color.dynamic(new Color('ffffff'),new Color('000000'))
        
        if (config.widgetFamily === undefined) {
            this.widgetFamily = -1;
        } else {
            if (config.widgetFamily === 'small') {
                this.widgetFamily = 1;
            } else if (config.widgetFamily === 'medium') {
                this.widgetFamily = 2;
            } else if (config.widgetFamily === 'large') {
                this.widgetFamily = 3;
            } else {
                this.widgetFamily = 0;
            }
        }

        let header = listWidget.addText('Steinbock🐐🧗'.toUpperCase());
        header.font = Font.boldSystemFont(10);
        header.centerAlignText();
        header.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));

        listWidget.addSpacer(7.5);

        if (this.currentUtilization.error) {
            let errMessage = listWidget.addText(this.currentUtilization.error);
            errMessage.font = Font.boldSystemFont(10);
            errMessage.centerAlignText();
            errMessage.textColor = Color.red();
            listWidget.addSpacer(20)
        } else {
            this.addDataView(listWidget);
            listWidget.addSpacer();
            if (this.utilizationHistory.error) {
                console.log(this.utilizationHistory)
                let errMessage = listWidget.addText(this.utilizationHistory.error);
                errMessage.font = Font.boldSystemFont(10);
                errMessage.centerAlignText();
                errMessage.textColor = Color.red();
                listWidget.addSpacer(10);
            } else {
                let chart = new LineChart(this.widgetFamily, this.utilizationHistory.data, this.isHoliday, this.parameters, this.today).configure();
                if (this.widgetFamily === 1 || this.widgetFamily === -1) {
                    listWidget.backgroundImage = (chart.getImage());
                } else if (this.widgetFamily === 2) {
                    listWidget.backgroundImage = (chart.getImage());
                } else if (this.widgetFamily === 3) {
                    listWidget.addImage(chart.getImage());
                }
                listWidget.centerAlignContent;
            }
        }
        return listWidget;
    }
 
    async getWebsiteContent(url) {
        let req = new Request(url);
        try {
            const website_content = await req.loadString();
            return {success: website_content};
        } catch(e) {
            return {error: e.toString()};
        }
    }
 
    async getCurrentUtilization() {
        const websiteContent = await this.getWebsiteContent("https://www.boulderado.de/boulderadoweb/gym-clientcounter/index.php?mode=get&token=eyJhbGciOiJIUzI1NiIsICJ0eXAiOiJKV1QifQ.eyJjdXN0b21lciI6IlN0ZWluYm9ja0tvbnN0YW56MzkyMDE5In0.Io2pIXQ4lXUmRXM3Q0snudOGYytyZkVv3hbSh_QrUA0&ampel=1");
        if (websiteContent.error) {
            return websiteContent;
        }

        let resultPercent = {error: 'Couldn\'t match current utilization'};
        const positionRegEx = /(left:[\s\S]*top)/;
        if (positionRegEx.test(websiteContent.success)) {
            const result = websiteContent.success.match(positionRegEx);
            const percentRegEx = /([0-9]+(\.|,|[0-9])*)/;
            if (percentRegEx.test(result[0])) {
                resultPercent = {success: 'Could receive utilization', utilization: parseFloat(result[0].match(percentRegEx))};
            }
        }
        return resultPercent;
    }
 
    async getUtilizationHistory() {
        let retObj = {};
        try {
            const websiteContent = await this.getWebsiteContent('https://raw.githubusercontent.com/robin-ger35/Steinbock_Capacity/main/aggregated_capacity_steinbock.csv');
            if (websiteContent.error) {
                return websiteContent;
            }
            const csvRows = websiteContent.success.split('\n');
            let csvColsRow = []
            for(let i = 1; i < csvRows.length; i++) {
                csvColsRow.push(csvRows[i].split(','));
            }
            let utilizationHistory = [];
            for(let i = 0; i < csvColsRow.length; i++) {
                if(csvColsRow[i][0] === this.parameters.day) {
                    utilizationHistory.push(parseFloat(csvColsRow[i][this.dataAggregation]))
                }
            }
            retObj = {success: true, data: utilizationHistory};
        } catch (e) {
            retObj = {error: e.toString()};
        }
        return retObj;
    }
 
    addDataView(widget) {
        let viewStack = widget.addStack();
        viewStack.layoutVertically();
         
        const time = parseInt(this.today.hour + this.today.minutes);
        let textByOpeningTimes;
        let colorByOpeningTimes;
        let fontSizeByOpeningTimes;
        if(((this.today.weekday === 'Monday' || this.today.weekday === 'Tuesday' || this.today.weekday === 'Wednesday' || this.today.weekday === 'Thursday' || this.today.weekday === 'Friday') && (time < 1000 || time > 2300)) || ((this.today.weekday === 'Saturday' || this.today.weekday === 'Sunday') && (time < 900 || time > 2200))) {
            textByOpeningTimes = 'The Steinbock is currently closed!';
            colorByOpeningTimes = Color.orange();
            fontSizeByOpeningTimes = 12;
        } else {
            let horizontal_stack1 = viewStack.addStack();
            horizontal_stack1.addSpacer();
            let label = horizontal_stack1.addText('Current Utilization:');
            label.font = Font.mediumSystemFont(12);
            label.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));
            horizontal_stack1.addSpacer();

            textByOpeningTimes = `${this.currentUtilization.utilization}% ≈ ${Math.round(80 * this.currentUtilization.utilization / 100)}/80`;
            colorByOpeningTimes = Tools.chooseColor(this.currentUtilization.utilization);
            fontSizeByOpeningTimes = 20;
        }
        
        
        if (this.isHoliday) {
            fontSizeByOpeningTimes = 15;
        }
        
        let horizontal_stack2 = viewStack.addStack();
        horizontal_stack2.addSpacer();
        let footnote = horizontal_stack2.addText(`${this.today.hour}:${this.today.minutes}`);
        footnote.font = Font.mediumSystemFont(8);
        footnote.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));
        horizontal_stack2.addSpacer();

        let horizontal_stack3 = viewStack.addStack();
        horizontal_stack3.addSpacer();
        let value = horizontal_stack3.addText(textByOpeningTimes);
        value.font = Font.mediumSystemFont(fontSizeByOpeningTimes);
        value.textColor = colorByOpeningTimes;
        horizontal_stack3.addSpacer();

        if (this.isHoliday) {
            let verticalStack = viewStack.addStack();
            verticalStack.layoutVertically();
            
            let vh1Stack = verticalStack.addStack();
            vh1Stack.addSpacer();
            let vh1Val = vh1Stack.addText('Opening Times may differ');
            vh1Val.font = Font.mediumSystemFont(8);
            vh1Val.textColor = Color.orange();
            vh1Stack.addSpacer();
            
            let vh2Stack = verticalStack.addStack();
            vh2Stack.addSpacer();
            let vh2Val = vh2Stack.addText('due to holidays!');
            vh2Val.font = Font.mediumSystemFont(8);
            vh2Val.textColor = Color.orange();
            vh2Stack.addSpacer();
        }
    }
 
    parseParameters() {
        const parameters = JSON.parse(args.widgetParameter);
        if (parameters != null) {
            if (parameters.hasOwnProperty('day')) {
                if (/[0-9]/.test(parameters.day)) {
                    let day = parseInt(parameters.day);
                    if (day >= 0 && day <= 6) {
                        return {day: WEEKDAYS[day]};
                    }
                }
            }
        }
        return {day: this.today.weekday};
    }
 
    getDate() {
        let today = new Date(Date.now());
        let day = today.getDate();
        day = day.toString().padStart(2, '0');

        let month = today.getMonth() + 1;
        month = month.toString().padStart(2, '0');
        
        let hour = today.getHours();
        hour = hour.toString().padStart(2, '0');
        
        let minutes = today.getMinutes();
        minutes = minutes.toString().padStart(2, '0');
        
        const date = {day: day, month: month, year: today.getFullYear(), hour: hour, minutes: minutes, weekday: WEEKDAYS[today.getDay()]};
        return date;
    }
 }
 
class LineChart {
    constructor(widgetFamily, utilizationHistory, isHoliday, parameters, today) {
        this.ctx = new DrawContext()
        this.imageWidth = 0;
        this.imageHeight = 0;
        this.scaleTo = 0;
//         this.stepLastYear = 0;
        this.widgetFamily = widgetFamily;
        this.utilizationHistory = utilizationHistory;
        this.shifter = isHoliday ? 0.4 : 0.5;
        this.dataMin = 0;
        this.dataMax = 100;
        this.parameters = parameters;
        this.today = today;
    }
     
    configure() {
        let widgetWidth = 0;
        let widgetHeight = 0;
        if (this.widgetFamily === 1 || this.widgetFamily === -1) {
            widgetWidth = 169;
            widgetHeight = 169;
            this.scaleTo = 0.65;
        } else if (this.widgetFamily === 2) {
            widgetWidth = 360;
            widgetHeight = 169;
            this.scaleTo = 1;
        } else if (this.widgetFamily === 3) {
            widgetWidth = 360;
            widgetHeight = 376;
            this.scaleTo = 0.75;
        }
        this.imageWidth = widgetWidth * Device.screenScale();
        this.imageHeight = widgetHeight * Device.screenScale();
        this.ctx.size = new Size( this.imageWidth, this.imageHeight );
        this.ctx.opaque = false;
        this.drawUtilizationPath();
        this.drawHelperLines();
        this.drawTimeTriangle();
        return this.ctx;
    }
     
    drawUtilizationPath() {
        let steps = this.imageWidth / (this.utilizationHistory.length - 1);
        let points = this.utilizationHistory.map((current, index, all) => {
            const x = steps * index;
            const y = this.imageHeight - (current - this.dataMin) / this.dataMax * this.imageHeight * this.shifter;
            return new Point(x, y);
        });
        
        let path = new Path();
        path.move(new Point(0, this.imageHeight));
        path.addLine(points[0]);
        for (let i = 0; i < points.length; i++) {
            path.addLine(points[i]);
        }
        path.addLine(new Point(points[points.length - 1].x, this.imageHeight));
        path.closeSubpath();
        this.ctx.addPath(path);
        this.ctx.setFillColor(new Color('555555'));
        this.ctx.fillPath(path);
    }
    
    drawHelperLines() {
        const tempLineArray = [25,50,75,100];
        for (let j = 0; j < tempLineArray.length; j++) {
            const temp_line = new Path();
            temp_line.move(new Point(0, this.imageHeight - (tempLineArray[j] - this.dataMin) / this.dataMax * this.imageHeight * this.shifter));
            temp_line.addLine(new Point(this.imageWidth, this.imageHeight - (tempLineArray[j] - this.dataMin) / this.dataMax * this.imageHeight * this.shifter));
            temp_line.closeSubpath();
            this.ctx.addPath(temp_line);
            this.ctx.setLineWidth(0.5);
            this.ctx.setStrokeColor(Tools.chooseColor(tempLineArray[j]));
            this.ctx.strokePath();
            if (j > 0) {
this.ctx.setTextColor(Tools.chooseColor(tempLineArray[j]));
            this.ctx.setFont(Font.mediumSystemFont(20));
            this.ctx.drawText(tempLineArray[j].toString(), new Point(0,this.imageHeight - (tempLineArray[j] - this.dataMin) / this.dataMax * this.imageHeight * this.shifter));
}
        }
    }
 
    drawTimeTriangle() {
        let currentStep = 0;
        if(this.parameters.day === WEEKDAYS[0] || this.parameters.day === WEEKDAYS[6]) {
            currentStep = parseInt(this.today.hour) - 9;
        } else {
            currentStep = parseInt(this.today.hour) - 10;
        }
        if(currentStep < 0) {
            return;
        }
        currentStep *= 4;
        currentStep += parseInt(this.today.minutes) / 15;
        let steps = this.imageWidth / (this.utilizationHistory.length - 1);
        const tempLine = new Path();
        tempLine.move(new Point(currentStep * steps, this.imageHeight - (15 - this.dataMin) / this.dataMax * this.imageHeight * this.shifter));
        tempLine.addLine(new Point(currentStep * steps + steps / 1.5, this.imageHeight));
        tempLine.addLine(new Point(currentStep * steps - steps / 1.5, this.imageHeight));
        tempLine.addLine(new Point(currentStep * steps, this.imageHeight - (15 - this.dataMin) / this.dataMax * this.imageHeight * this.shifter));
        tempLine.closeSubpath();
        this.ctx.addPath(tempLine);
        this.ctx.setLineWidth(0.5);
        this.ctx.setFillColor(Color.blue());
        this.ctx.fillPath();
    }
}
 
class Tools {
    static chooseColor(utilization) {
        const red = 0;
        const yellow = 60;
        const green = 120;
        const turquoise = 180;
        const blue = 240;
        const pink = 300;
        
        let colour = 'ffffff';
        if(utilization >= 0 && utilization < 25) {
            colour = this.hsl_col_perc((utilization - 0) / (25 - 0) * 100, 150, green);
        } else if(utilization >= 25 && utilization < 50) {
            colour = this.hsl_col_perc((utilization - 25) / (50 - 25) * 100, green, yellow);
        } else if(utilization >= 50 && utilization <= 75) {
            colour = this.hsl_col_perc((utilization - 50) / (90 - 50) * 100, yellow, red);
        } else {
            colour = this.hsl_col_perc((utilization - 90) / (100 - 90) * 100, 360, pink);
        }
        return new Color(colour);
    }
    
    static hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }
            
    static hsl_col_perc(percent, start, end) {
        const a = percent / 100;
        const b = (end - start) * a;
        const c = b + start;
        return this.hslToHex(c,100,45);
    }
    
    static isHoliday(today) {
        let holidays = [];

        const easter = this.calculateEaster(today.year);
        const easterDate = new Date(today.year, parseInt(easter.month) - 1, parseInt(easter.day));

        const newYear = {day: '01', month: '01'};
        const epiphany = {day: '06', month: '01'};
        const goodFridayDate = new Date(easterDate);
        goodFridayDate.setDate(goodFridayDate.getDate() - 2);
        const goodFriday = {day: goodFridayDate.getDate().toString().padStart(2, '0'), month: (goodFridayDate.getMonth() + 1).toString().padStart(2, '0')};
        const easterSunday = easter;
        const easterMondayDate = new Date(easterDate);
        easterMondayDate.setDate(easterMondayDate.getDate() + 1);
        const easterMonday = {day: easterMondayDate.getDate().toString().padStart(2, '0'), month: (easterMondayDate.getMonth() + 1).toString().padStart(2, '0')};
        const laborDay = {day: '01', month: '05'};
        const ascensionDayDate = new Date(easterDate);
        ascensionDayDate.setDate(ascensionDayDate.getDate() + 39);
        const ascensionDay = {day: ascensionDayDate.getDate().toString().padStart(2, '0'), month: (ascensionDayDate.getMonth() + 1).toString().padStart(2, '0')};
        const whitSundayDate = new Date(easterDate);
        whitSundayDate.setDate(whitSundayDate.getDate() + 49);
        const whitSunday = {day: whitSundayDate.getDate().toString().padStart(2, '0'), month: (whitSundayDate.getMonth() + 1).toString().padStart(2, '0')};
        const whitMondayDate = new Date(easterDate);
        whitMondayDate.setDate(whitMondayDate.getDate() + 50);
        const whitMonday = {day: whitMondayDate.getDate().toString().padStart(2, '0'), month: (whitMondayDate.getMonth() + 1).toString().padStart(2, '0')};
        const corpusChristiDate = new Date(easterDate);
        corpusChristiDate.setDate(corpusChristiDate.getDate() + 60);
        const corpusChristi = {day: corpusChristiDate.getDate().toString().padStart(2, '0'), month: (corpusChristiDate.getMonth() + 1).toString().padStart(2, '0')};
        const germanUnityDay = {day: '03', month: '10'};
        const allSaints = {day: '01', month: '11'};
        const christmas = {day: '24', month: '12'};
        const christmasOne = {day: '25', month: '12'};
        const christmasTwo = {day: '26', month: '12'};
        const newYearsEve = {day: '31', month: '12'};

        holidays.push(newYear);
        holidays.push(epiphany);
        holidays.push(goodFriday);
        holidays.push(easterSunday);
        holidays.push(easterMonday);
        holidays.push(laborDay);
        holidays.push(ascensionDay);
        holidays.push(whitSunday);
        holidays.push(whitMonday);
        holidays.push(corpusChristi);
        holidays.push(germanUnityDay);
        holidays.push(allSaints);
        holidays.push(christmas);
        holidays.push(christmasOne);
        holidays.push(christmasTwo);
        holidays.push(newYearsEve);

        let isHoliday = false;
        holidays.forEach((val, idx) => {
            if (val.day === today.day && val.month === today.month) {
                isHoliday = true;
            }
        });
        return isHoliday;
    }

    static calculateEaster(year) {
        let day;
        let month;
        let a = year % 19;
        let b = year % 4;
        let c = year % 7;
        let p = Math.floor(year / 100);
        let q = Math.floor((13 + 8 * p) / 25);
        let m = (15 - q + p - p / 4) % 30;
        let n = (4 + p - p / 4) % 7;
        let d = (19 * a + m) % 30;
        let e = (2 * b + 4 * c + 6 * d + n) % 7;
        let days = (22 + d + e);
        if ((d == 29) && (e == 6)) {
            day = 19;
            month = 4;
        } else if ((d == 28) && (e == 6)) {
            day = 18;
            month = 4;
        } else {
            if (days > 31) {
                day = days - 31;
                month = 4;
            } else {
                day = days;
                month = 3;
            }
        }
        day = day.toString().padStart(2, '0');
        month = month.toString().padStart(2, '0');
        return {day: day, month: month};
    }
}
 
await new SteinbockWidget().run();
