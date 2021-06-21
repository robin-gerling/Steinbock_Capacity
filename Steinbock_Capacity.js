let widget_family = 0;
const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const today = get_today();
const DATA_MIN = 0;
const DATA_MAX = 100;


let widget = await createWidget()


if (config.runsInWidget) {
    Script.setWidget(widget)
} else {
    widget.presentSmall()
}


if (config.runsWithSiri) {
    const capacity = await get_steinbock_capacity();
    if (capacity !== -1) {
        Speech.speak(`The Steinbock has an utilization of ${capacity} % right now. This corresponds to ${Math.round(80 * capacity / 100)} people.`);
    } else {
        Speech.speak('Oops, Looks like there was an Error! Please try again later.');
    }
}

Script.complete()

async function createWidget() {    
    let widget = new ListWidget();
    widget.setPadding(10, 0, 0, 0);
    widget.backgroundColor = Color.dynamic(new Color('ffffff'),new Color('000000'))
    
    if (config.widgetFamily === undefined) {
        widget_family = -1;
    } else {
        if (config.widgetFamily === 'small') {
            widget_family = 1;
        } else if (config.widgetFamily === 'medium') {
            widget_family = 2;
        } else if (config.widgetFamily === 'large') {
            widget_family = 3;
        } else {
            widget_family = 0;
        }
    }

    let header = widget.addText('Steinbock🐐🧗'.toUpperCase());
    header.font = Font.boldSystemFont(10);
    header.centerAlignText();
    header.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));

    widget.addSpacer(7.5);

    const capacity = await get_steinbock_capacity();
    
    if(capacity === -1) {
        let err_message = widget.addText('No data available!\nPerhaps, you may not be connected to the Internet!');
        err_message.font = Font.boldSystemFont(10);
        err_message.centerAlignText();
        err_message.textColor = Color.red();
        widget.addSpacer(20)
    } else {
        addDataView(widget, capacity);
        widget.addSpacer();
        const capacity_csv = await get_website_content('https://raw.githubusercontent.com/robin-ger35/Steinbock_Capacity/main/capacity_steinbock.csv');
        const time_capacity = split_csv(capacity_csv);
        const median_array = get_aggregated_data(time_capacity);
        if(median_array.length === 0) {
            let err_message = widget.addText('Chart not available!');
            err_message.font = Font.boldSystemFont(10);
            err_message.centerAlignText();
            err_message.textColor = Color.red();
            widget.addSpacer(10);
        } else {
            add_graph(widget, median_array);
        }
    }
    return widget;
}

function match_capacity_percent(content) {
    const regex = /(left:[\s\S]*top)/;
    const result = content.match(regex);
    const regex_percent = /([0-9]+(\.|,|[0-9])*)/;
    const result_percent = result[0].match(regex_percent);
    return result_percent[0];
}

async function get_steinbock_capacity() {
    let capacity = -1;
    const steinbock_content = await get_website_content("https://www.boulderado.de/boulderadoweb/gym-clientcounter/index.php?mode=get&token=eyJhbGciOiJIUzI1NiIsICJ0eXAiOiJKV1QifQ.eyJjdXN0b21lciI6IlN0ZWluYm9ja0tvbnN0YW56MzkyMDE5In0.Io2pIXQ4lXUmRXM3Q0snudOGYytyZkVv3hbSh_QrUA0&ampel=1");
    if (steinbock_content !== -1) {
        capacity = match_capacity_percent(steinbock_content);
    }
    return capacity;
}

async function get_website_content(url_string) {
    let req = new Request(url_string);
    try {
        const website_content = await req.loadString();
        return website_content;
    } catch {
        return -1;
    }
}

function add_graph(widget, median_array) {
    
    let draw_context = new DrawContext();
    let widget_width = 0;
    let widget_height = 0;
    if (widget_family === 1 || widget_family === -1) {
        draw_graph(widget, draw_context, 169,169, 0.5, median_array);
        widget.backgroundImage = (draw_context.getImage());
    } else if (widget_family === 2) {
        draw_graph(widget, draw_context, 360,169, 1, median_array);
        widget.backgroundImage = (draw_context.getImage());
    } else if (widget_family === 3) {
        draw_graph(widget, draw_context, 360, 376, 0.75, median_array);
        widget.addImage(draw_context.getImage());
    }
    
    widget.centerAlignContent;
}

function draw_graph(widget, drawContext, widget_width, widget_height, scale_to, median_array) {
    const image_width = widget_width * Device.screenScale();
    const image_height = widget_height * Device.screenScale();
    
    drawContext.size = new Size(image_width, image_height);
    drawContext.opaque = false;
    
    let steps = image_width / (median_array.length - 1);
    let points = median_array.map((current, index, all) => {
        const x = steps * index;
        const y = image_height - (current - DATA_MIN) / DATA_MAX * image_height * scale_to;
        return new Point(x, y);
    });
    
    let path = new Path();
    path.move(new Point(0, image_height));
    path.addLine(points[0]);
    for (let i = 0; i < points.length; i++) {
        path.addLine(points[i]);
    }
    path.addLine(new Point(points[points.length - 1].x, image_height));
    path.closeSubpath();
    drawContext.addPath(path);
    drawContext.setFillColor(new Color('555555'));
    drawContext.fillPath(path);
    
    // horizontal lines
    const shifter = 0.5
    const temp_line_array = [25,50,75,100];
    for (let j = 0; j < temp_line_array.length; j++) {
        const temp_line = new Path();
        temp_line.move(new Point(0, image_height - (temp_line_array[j] - DATA_MIN) / DATA_MAX * image_height * shifter));
        temp_line.addLine(new Point(image_width, image_height - (temp_line_array[j] - DATA_MIN) / DATA_MAX * image_height * shifter));
        temp_line.closeSubpath();
        drawContext.addPath(temp_line);
        drawContext.setLineWidth(0.5);
        drawContext.setStrokeColor(choose_color(temp_line_array[j]));
        drawContext.strokePath();
        drawContext.setTextColor(choose_color(temp_line_array[j]));
        drawContext.setFont(Font.mediumSystemFont(20));
        drawContext.drawText(temp_line_array[j].toString(), new Point(0,image_height - (temp_line_array[j] - DATA_MIN) / DATA_MAX * image_height * shifter));
    }
    
    draw_time_triangle(drawContext, image_width, image_height, steps, shifter)
    return drawContext;
}

function draw_time_triangle(drawContext, image_width, image_height, steps, shifter) {
    let current_step = 0;
    if(today.weekday === weekday[0] || today.weekday === weekday[6]) {
        current_step = parseInt(today.hour) - 9;
    } else {
        current_step = parseInt(today.hour) - 10;
    }
    if(current_step < 0) {
        return;
    }
    current_step *= 4;
    current_step += parseInt(today.minutes) / 15;
    
    const temp_line = new Path();
    temp_line.move(new Point(current_step * steps, image_height - (15 - DATA_MIN) / DATA_MAX * image_height * shifter));
    temp_line.addLine(new Point(current_step * steps + steps / 1.5, image_height));
    temp_line.addLine(new Point(current_step * steps - steps / 1.5, image_height));
    temp_line.addLine(new Point(current_step * steps, image_height - (15 - DATA_MIN) / DATA_MAX * image_height * shifter));
    temp_line.closeSubpath();
    drawContext.addPath(temp_line);
    drawContext.setLineWidth(0.5);
    drawContext.setFillColor(Color.blue());
    drawContext.fillPath();
}

function addDataView(widget, capacity) {
    let viewStack = widget.addStack();
    viewStack.layoutVertically();
    
    const time = parseInt(today.hour + today.minutes)
    if(((today.weekday === 'Monday' || today.weekday === 'Tuesday' || today.weekday === 'Wednesday' || today.weekday === 'Thursday' || today.weekday === 'Friday') && (time < 1000 || time > 2300)) || ((today.weekday === 'Saturday' || today.weekday === 'Sunday') && (time < 900 || time > 2200))) {
        add_text_outside_opening_times(viewStack);
    } else {
        add_text_within_opening_times(viewStack, capacity);
    }
}

function add_text_within_opening_times(viewStack, capacity) {
    let horizontal_stack1 = viewStack.addStack();
    horizontal_stack1.addSpacer();
    let label = horizontal_stack1.addText('Current Utilization:');
    label.font = Font.mediumSystemFont(12);
    label.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));
    horizontal_stack1.addSpacer();
    
    let horizontal_stack2 = viewStack.addStack();
    horizontal_stack2.addSpacer();
    let footnote = horizontal_stack2.addText(`${today.hour}:${today.minutes}`);
    footnote.font = Font.mediumSystemFont(8);
    footnote.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));
    horizontal_stack2.addSpacer();
    let value_text = `${capacity}% ≈ ${Math.round(80 * capacity / 100)}/80`;
    let value_color = choose_color(capacity);

    let horizontal_stack3 = viewStack.addStack();
    horizontal_stack3.addSpacer();
    let value = horizontal_stack3.addText(value_text);
    value.font = Font.mediumSystemFont(20);
    value.textColor = value_color;
    horizontal_stack3.addSpacer();
}

function add_text_outside_opening_times(viewStack, capacity) {
    let horizontal_stack2 = viewStack.addStack();
    horizontal_stack2.addSpacer();
    let footnote = horizontal_stack2.addText(`${today.hour}:${today.minutes}`);
    footnote.font = Font.mediumSystemFont(8);
    footnote.textColor = Color.dynamic(new Color('000000'),new Color('ffffff'));
    horizontal_stack2.addSpacer();

    let horizontal_stack3 = viewStack.addStack();
    horizontal_stack3.addSpacer();
    let value = horizontal_stack3.addText('The Steinbock is not open at the moment!');
    value.font = Font.mediumSystemFont(12);
    value.textColor = Color.orange();
    horizontal_stack3.addSpacer();
}

function split_csv(csv) {
    const rows = csv.split('\n');
    let splitted_rows = []
    for(let i = 1; i < rows.length; i++) {
        splitted_rows.push(rows[i].split(','));
    }
    let time_capacity = {};
    for(let i = 0; i < splitted_rows.length; i++) {
         if(splitted_rows[i][0] === today.weekday) {
            if(splitted_rows[i][2] in time_capacity) {
                console.log('IN')
                time_capacity[splitted_rows[i][2]].push(parseInt(splitted_rows[i][3]));
            } else {
                time_capacity[splitted_rows[i][2]] = [parseInt(splitted_rows[i][3])];
            }
         }
    }
    return time_capacity;
}

function get_aggregated_data(time_capacity) {
    let median_array = [];
    for (let key in time_capacity) {
        time_capacity[key].sort((a, b) => a - b)
        const half = Math.floor(time_capacity[key].length / 2);
        let median = 0;
        if (time_capacity[key].length % 2) {
            median_array.push(time_capacity[key][half]);
        } else {
            median_array.push((time_capacity[key][half - 1] + time_capacity[key][half]) / 2.0);
        }
    }
    return median_array;
}


function choose_color(temperature) {
    const red = 0;
    const yellow = 60;
    const green = 120;
    const turquoise = 180;
    const blue = 240;
    const pink = 300;
    
    let colour = 'ffffff';
    if(temperature >= 0 && temperature < 25) {
        colour = hsl_col_perc((temperature - 0) / (25 - 0) * 100, 150, green);
    } else if(temperature >= 25 && temperature < 50) {
        colour = hsl_col_perc((temperature - 25) / (50 - 25) * 100, green, yellow);
    } else if(temperature >= 50 && temperature <= 75) {
        colour = hsl_col_perc((temperature - 50) / (90 - 50) * 100, yellow, red);
    } else {
        colour = hsl_col_perc((temperature - 90) / (100 - 90) * 100, red, pink);
    }
    return new Color(colour);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
        
function hsl_col_perc(percent, start, end) {
  const a = percent / 100;
  const b = (end - start) * a;
  const c = b + start;
  return hslToHex(c,100,45);
}

function get_today() {
    let today = new Date(Date.now());
    let day = today.getDate();
    day = day.toString().padStart(2, '0');

    let month = today.getMonth() + 1;
    month = month.toString().padStart(2, '0');
    
    let hour = today.getHours();
    hour = hour.toString().padStart(2, '0');
    
    let minutes = today.getMinutes();
    minutes = minutes.toString().padStart(2, '0');
    
    const date = {day: day, month: month, year: today.getFullYear(), hour: hour, minutes: minutes, weekday: weekday[today.getDay()]};
    return date;
}
