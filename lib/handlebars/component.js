"use strict";

var path = require('path');
var authorization = require('../authorization');
var config = require('../configuration');
var componentRegistry = require('../component_registry');
var renderer = require('../renderer');
var extend = require('node.extend');
var Handlebars = require('handlebars');

/**
 * This Handlebars helper aggregates child components into the parent.
 * The helper invokes the renderer to load custom data from the data layer for the template
 * and calls the rendering process after the data is received, to render the component.
 *
 * Complete syntax:
 *      {{component name="compnentId" version="versionNumber" view="viewID" sid="staticId" placeholder=true}}
 * </pre>
 * @example
 *      Aggregates the view ``button_green`` from the parent component.
 *
 *      <div class="template">
 *          {{component view="button_green"}}
 *      </div>
 *
 * @example
 *      Aggregates the view ``index`` of the component ``textbox`` with the latest version.
 *
 *      <div class="template">
 *          {{component name="textbox" view="index"}}
 *      </div>
 *
 * @example
 *      Aggregates the view ``index`` of the component ``textbox`` with the latest version
 *      and sets the static id ``button1``.
 *
 *      <div class="template">
 *          {{component name="button" view="index" sid="button1"}}
 *      </div>
 *
 * @example
 * Aggregates the view ``help`` from the parent component but dosn't load the palceholder.
 * <div class="template">
 *     {{component view="help" placeholder=false}}
 * </div>
 *
 * @name ComponentHelper
 * @class
 * @constructor
 */
function ComponentHelper() {}

/**
 * The helper decides what view should use and from what component.
 * It sends automatically an error component if something went wrong.
 *
 * To determine what component and view to use, the following steps are performed:
 *
 * 1. the view id is required!
 *
 * 2. if the version is specified, the name of the component must be specified too.
 *
 * @param {Object} options the component options
 * @param {String} [options.name] indicates the component from which the content will be aggregated. When this option is missing the current component will be used (the version is always the current version in this case).
 * @param {String} [options.version] the version of the component specified with the previous option. If the version is not specified the latest version will be used. You can also use version fragments as described in the documentation for component versioning. When you specify the version you also need to specify the name of the component, otherwise an error will be thrown.
 * @param {String} options.view the view that will be aggregated.
 * @param {String} [options.sid='undefined'] the component static id, used in the client-side controller
 * @param {Boolean} [options.placeholder=true] set the placeholder to be rendered or not
 * @throws {Error} when the context has the wrong keys
 * @returns {String} the generated placeholder div with the instance id as id attribute
 */
ComponentHelper.prototype.helper = function (options) {
    // handlebars sends the current context as this
    var childComponent = {
        id: options.hash['name'],
        version: options.hash['version'],
        view: options.hash['view'],
        staticId: options.hash['sid'],
        context: this,
        placeholder: options.hash['placeholder'] == undefined ? true : options.hash['placeholder'],
        session: renderer.rain.session
    };

    var rain = renderer.rain;

    if (!childComponent.view) {
        renderer.replaceWithError(500, childComponent,
            new RainError('You have to specify a view id with view="VIEWID"!',
                          RainError.ERROR_PRECONDITION_FAILED)
        );
        return aggregateComponent(childComponent);
    }

    if (childComponent.version && !childComponent.id) {
        renderer.replaceWithError(500, childComponent,
            new RainError('The component name is required if you are specifying the version!',
                          RainError.ERROR_PRECONDITION_FAILED)
        );
        return aggregateComponent(childComponent);
    }

    if (!childComponent.id) {
        childComponent.id = rain.component.id;
        childComponent.version = rain.component.version;
    } else {
        childComponent.version = componentRegistry.getLatestVersion(childComponent.id,
                                                                    childComponent.version);
        if (!childComponent.version) {
            renderer.replaceWithError(404, childComponent,
                new RainError('Component %s not found!', [childComponent.id])
            );
            return aggregateComponent(childComponent);
        }
    }

    var componentConfig = componentRegistry.getConfig(childComponent.id,
                                                      childComponent.version);
    if (!componentConfig.views[childComponent.view]){
        renderer.replaceWithError(404, childComponent,
             new RainError("The  view %s dosn't exists!", [childComponent.view])
        );
        return aggregateComponent(childComponent);
    }

    /**
     * Begin authorization check
     */
    var permissions = [].concat(componentConfig.permissions || [],
                                componentConfig.views[childComponent.view].permissions || []);

    var dynamicConditions = [];

    // Add component dynamic conditions.
    if (componentConfig.dynamicConditions && componentConfig.dynamicConditions._component) {
        dynamicConditions.push(componentConfig.dynamicConditions._component);
    }

    // Add view dynamic conditions.
    if (componentConfig.dynamicConditions &&
        componentConfig.dynamicConditions[childComponent.view]) {
        dynamicConditions.push(componentConfig.dynamicConditions[childComponent.view]);
    }

    var securityContext = createSecurityContext({
        user: rain.session && rain.session.user
    });

    if (!authorization.authorize(securityContext, permissions, dynamicConditions)) {
        renderer.replaceWithError(401, childComponent,
             new RainError('Unauthorized access to component "%s" !',
                           [childComponent.id]));
        return aggregateComponent(childComponent);
    }

    /**
     * End authorization check
     */

    return aggregateComponent(childComponent);
};


/**
 * Aggregates the component with the given data.
 *
 * 1. Creates an instance id
 * 2. Push the component information to the parent component
 * 3. Aggregates the component
 *
 * @param {Object} childComponent The component information which has to be aggregated
 * @private
 * @memberOf ComponentHelper#
 */
function aggregateComponent(childComponent) {
    var rain = renderer.rain;
    var componentConfig = componentRegistry.getConfig(childComponent.id,
                                                      childComponent.version);
    var transport = rain.transport;
    transport.renderLevel++;
    var instanceId = renderer.createInstanceId(rain.instanceId,
                                               transport.renderCount++,
                                               childComponent.staticId);

    rain.childrenInstanceIds.push({
        id: childComponent.id,
        version: childComponent.version,
        staticId: childComponent.staticId,
        controller: componentConfig.views[childComponent.view].controller &&
                    componentConfig.views[childComponent.view].controller.client,
        instanceId: instanceId,
        placeholder: childComponent.placeholder
    });

    childComponent.instanceId = instanceId;
    renderer.loadDataAndSend(childComponent, transport);

    return createPlaceholder(instanceId);
}

/**
 * Creates the placeholder html snippet.
 *
 * @param {String} instanceId The instance id as hash string
 * @private
 * @memberOf ComponentHelper#
 */
function createPlaceholder(instanceId){
    return new Handlebars.SafeString('<div id="' + instanceId + '"></div>\n');
}

/**
 * Creates the security context and freeze the it after the creation.
 *
 * @param {Object} preferences
 * @returns {securityContext} securityContext
 * @private
 * @memberOf ComponentHelper#
 */
function createSecurityContext(preferences) {
    return {
        user: extend({}, preferences.user)
    };
}

module.exports = {
    name: 'component',
    helper: new ComponentHelper().helper
};