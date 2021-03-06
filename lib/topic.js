let ContentReader = require('./contentReader')
let Course = require('./course')
let yaml = require('js-yaml')
let path = require('path')
const {toTitleCase} = require('./helpers')
const {CURRICULUM_BASE_URL} = require('./constants')

module.exports = class Topic extends ContentReader {
  constructor (text) {
    super(text)
    this.courses = {};
    this.topicNamespace = null;
    this.standards = [];
    this.archived = [];
    try {
      this.parse(this.rawText);
    } catch(err) {
      console.error(`Problem with ${this.contentPath}`)
    }
  }

  parse(text) {
    if (text.length == 0) throw new Error("Passed empty Topic README");
    yaml.safeLoadAll(text.split("---")[0], (doc)=>{
      for (var prop in doc) {
        this[prop] = doc[prop];
      }
    })
  }

/**
 * Sets new topic namespace
 * @param {string} namespace
 */
  setNamespace(namespace) {
    this.topicNamespace = namespace;
  }

/**
 * Sets new git networking methods
 * @param {object} `./networking/github.js` instance
 */
  setGit(git) {
    this.git = git;
  }

/**
 * Adds course to the `courses` object
 * @param {Course}
 */
  addCourse(course) {
    this.courses[course.slug] = course;
    this.courses[course.slug].setGit(this.git);
  }

/**
 * Adds insights to the `archived` array
 * @param {array} insights
 */
  addArchivedInsights(insights) {
    this.archived = this.archived.concat(insights || []);
  }

/**
 * Adds new Standard object to topic
 * @param {Standard}
 */
  addStandard(standard) {
    this.standards.push(standard);
  }

  getInsights(filter,  { includeArchived = false } = {}) {
    const insights = Object.keys(this.courses).reduce((courses, course) =>
      courses.concat(this.courses[course].getInsights(filter)),
      []
    );
    return includeArchived ?  insights.concat(filter ? this.archived.filter(insight => filter(insight)) : this.archived)
      : insights;
  }

  renderArchived(filter) {
    const branch = this.git.getGitBranch();

    const wantedArchived = filter ? this.archived.filter(insight => filter(insight)) : this.archived;

    const markdown = wantedArchived.reduce((md, insight) => {
      const link = this.git.getInsightURL(branch, insight.contentPath.split('curriculum/')[1]);
      return md + `${insight.workoutName || 'N/A'} | [${path.basename(insight.contentPath)}](${link}) | ${insight.stub ? 'stub' : 'live'}\n`;
    }, '');

    return markdown.length ?
      `\n# Archived\n\nWorkout | Insight | Status\n--- | --- | ---\n${markdown}`
      : '';
  }

  renderCourses(filter, { includeArchived = false } = {}) {
    let markdown = '';
    Object.keys(this.courses).forEach(courseName => {
      markdown += this.courses[courseName].renderCourse(filter);
    });
    return includeArchived ? markdown + this.renderArchived(filter) : markdown;
  }


/**
 * Generates markdown based on current object properties
 * @returns {string} Markdown
 */
  render() {
    // this should produce the readme file that represents the topic
  }


/**
 * Returns an object listing the contents of the Topic
 * @returns {object} topic contents
 */
  getStats(verbose) {

    let stats = {
      courses: 0,
      workouts: 0,
      insights: 0,
      practiceQuestions: 0,
      revisionQuestions: 0,
      quizQuestions: 0,
      standards: this.standards.length,
      stubs: 0,
      placementTestReady: true
    };
    for (let key in this.courses) {

      let courseStats = this.courses[key].getStats(verbose);
      if (!verbose && courseStats.workouts == 0) continue;
      stats.courses++;
      stats.workouts += courseStats.workouts;
      stats.insights += courseStats.insights;
      stats.practiceQuestions += courseStats.practiceQuestions;
      stats.revisionQuestions += courseStats.revisionQuestions;
      stats.quizQuestions += courseStats.quizQuestions;
      stats.standards += courseStats.standards;
      stats.stubs += courseStats.stubs;
      if (!courseStats.placementTestReady) stats.placementTestReady = false;

    }
    return stats;
  }

/**
 * Render Topic stats row, as markdown table
 * @returns {string} Markdown row
 */
  renderTopicStatsRow() {
    let stats = this.getStats();
    return `[[${toTitleCase(this.slug)} Topic]] | ${stats.courses} | ${stats.workouts} | ${stats.insights} | ${stats.practiceQuestions} | ${stats.revisionQuestions} | ${stats.standards} | ${stats.assessments || 0} | ${stats.stubs}\n`;
  }


/**
 * Render Topic wiki page, as markdown
 * @returns {string} Markdown Topic Wiki page
 */
  renderTopicWikiPage() {
    let data = "";
    data += `<!-- BEGIN AUTOGENERATED TOPIC PAGE -->\n`;
    data += `- [The Course Folder](${CURRICULUM_BASE_URL}/tree/master/${this.slug})
- [Standards](${CURRICULUM_BASE_URL}/tree/master/${this.slug})

## Live Courses
`;
    for (let courseName in this.courses) {
      data+=`- [${ toTitleCase( courseName ) }](${CURRICULUM_BASE_URL}/tree/master/${this.slug}/${courseName})\n`;
    }
    data += `<!-- END AUTOGENERATED TOPIC PAGE -->\n\n\n`;


    return data;
  }
}
