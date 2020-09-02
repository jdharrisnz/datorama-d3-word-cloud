var wordCloud = {
  'initialize': function() {
    // Store the query result
      var queryResult = DA.query.getQueryResult();
    
    // Create prefs if not set by the user
      if (typeof prefs == 'undefined') {
        prefs = {
          'fitAllWords': false,
          'removePunc': '',
          'removeWords': '',
          'case': 'lower',
          'font': 'sans-serif',
          'fontWeight': 'bold',
          'rotation': 0,
          'extraPadding': 0
        };
      }
    
    // Format the punctuation/word removals and store them as RegExp objects
      prefs.removePunc = prefs.removePunc.replace(/[\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&]/g, '\\$&');
      prefs.removeWords = prefs.removeWords.replace(/[\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&]/g, '\\$&');
      var removePunc = new RegExp('\\b[' + prefs.removePunc.replace(/\s/g, '') + ']\\B|\\B[' + prefs.removePunc.replace(/\s/g, '') + ']\\b', 'g');
      var removeWords = new RegExp('\\b' + prefs.removeWords.replace(/\s/g, '\\b|\\b') + '\\b', 'gi');
    
    // Add a new string method
      String.prototype.toCase = function(choice) {
        switch(choice) {
          case 'upper':
            return this.toUpperCase();
          case 'lower':
            return this.toLowerCase();
          case 'proper':
            if (this.length > 0) { return this.split(' ').map(x => x[0].toUpperCase() + x.substr(1)).join(' '); }
            else { return this; }
            break;
          default:
            return this;
        }
      };
    
    // Count unique words
      var wordsSource = d3.nest()
        .key(d => d)
        .entries(queryResult.rows.map(x => x[0].value
          .toCase(prefs.case)
          .replace(removePunc, '')
          .replace(removeWords, ' ')
          .split(' '))
          .flat()
          .filter(x => x !== ''));
    
    // Create the svg and measure the box
      var svg = d3.select('#__da-app-content').append('svg')
        .attr('width', '100%')
        .attr('height', '100%');
      var svgBox = svg.node().getBoundingClientRect();
    
    // Set the padding and calculate the size multiplier
      var padding = 1 + Math.abs(prefs.extraPadding);
      var sizeFactor = (svgBox.width * svgBox.height) / d3.sum(wordsSource.map(x => ((x.key.length * x.values.length + padding * 2) * x.values.length + padding * 2)));
    
    // Create a layout function to facilitate looping
      var layout;
      function generateLayout() {
        layout = d3.layout.cloud()
          .size([svgBox.width, svgBox.height])
          .words(wordsSource.map(d => { return { 'text': d.key, 'size': d.values.length * sizeFactor }; }))
          .padding(padding)
          .rotate(() => Math.random() * prefs.rotation - (prefs.rotation / 2))
          .font(prefs.font)
          .fontSize(d => d.size)
          .fontWeight(prefs.fontWeight)
          .on('end', draw);
      }
      generateLayout();
    
    // Create a draw function
      function draw(words) {
        if (prefs.fitAllWords === true && words.length < wordsSource.length) {
          sizeFactor = sizeFactor * 0.9;
          generateLayout();
          layout.start();
        }
        else {
          var maxSize = d3.max(words.map(x => x.size));
          var opacityScale = d3.scaleLinear().domain([0, 1]).range([0.20, 1]);
          
          svg
          .attr('viewBox', () => layout.size().map(x => x / 2 * -1).join(' ') + ' ' + layout.size().join(' '))
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .selectAll('text')
          .data(words)
          .join('text')
            .attr('class', 'word')
            .style('font-family', prefs.font)
            .style('font-size', d => d.size + 'px')
            .style('font-weight', d => d.weight)
            .style('opacity', 0)
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(0, 0) rotate(0)')
            .text(d => d.text)
            .on('mouseover', function(d) {
              var wordBox = this.getBoundingClientRect();
              var topHalf = wordBox.top + wordBox.height / 2 < svgBox.height / 2;
              
              tooltip
              .attr('class', () => {
                if (topHalf) {
                  return 'tooltipTop';
                }
                else {
                  return 'tooltipBottom';
                }
              })
              .style('top', () => {
                if (topHalf) {
                  return wordBox.top + wordBox.height + 5 + 'px';
                }
                else {
                  return wordBox.top - 5 + 'px';
                }
              })
              .style('left', wordBox.left + wordBox.width / 2 + 'px')
              .style('transform', () => {
                if (topHalf) {
                  return 'translate(-50%, 0)';
                }
                else {
                  return 'translate(-50%, -100%)';
                }
              })
              .style('visibility', 'visible')
              .text(() => {
                var ocurrences = Math.round(d.size / sizeFactor);
                if (ocurrences > 1) {
                  return ocurrences + ' ocurrences';
                }
                else {
                  return ocurrences + ' ocurrence';
                }
              });
              
            })
            .on('mouseout', function() { tooltip.style('visibility', 'hidden'); })
            .transition().duration(600)
            .style('opacity', d => opacityScale(d.size / maxSize))
            .attr('transform', d => 'translate(' + [d.x, d.y] + ') rotate(' + d.rotate + ')');
        }
      }
    
    // Create a tooltip to be used in the mouseover function
      var tooltip = d3.select('#__da-app-content').append('div')
        .attr('id', 'tooltip')
        .style('visibility', 'hidden');
    
    // Start the layout
      layout.start();
  }
};