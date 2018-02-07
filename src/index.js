// @flow weak
const fs = require('fs');
const os = require('os');
const path = require('path');
const tmpFilePath = path.resolve(os.tmpdir(), 'changedFiles.json');
let filesChanged; // { name:'', files: []}; //example
try {
    if (process.env.FILES_CHANGED) {
        filesChanged = JSON.parse(process.env.FILES_CHANGED);
    }
    if (fs.existsSync(tmpFilePath)) 
    {
        const contents = fs.readFileSync(tmpFilePath, 'utf8');
        filesChanged = JSON.parse(contents);
    }
}
catch (e) {
    filesChanged = null;
}

export default function babelPluginReactElementInfo({ types: t }) {
    const defaultPrefix = 'data-qa';
    let prefix;
    let filenameAttr;
    let nodeNameAttr;
    let changedVersionAttr;

    const visitor = {
        Program(path, state) {
            if (state.opts.prefix) {
                prefix = `data-${state.opts.prefix}`;
            } else {
                prefix = defaultPrefix;
            }
          
            changedVersionAttr = prefix + '-changed-version';
            filenameAttr = `${prefix}-file`;
            nodeNameAttr = `${prefix}-node`;
        },
        JSXOpeningElement(path, state) {
            const attributes = path.container.openingElement.attributes;

            const newAttributes = [];

            if (filesChanged && state.file && state.file.opts
                && state.file.opts.sourceFileName
                && (filesChanged.files.includes(state.file.opts.sourceFileName))) {
                newAttributes.push(t.jSXAttribute(
                    t.jSXIdentifier(changedVersionAttr),
                    t.stringLiteral(filesChanged.name))
                );
            }

            if (path.container && path.container.openingElement
                && path.container.openingElement.name
                && path.container.openingElement.name.name) {
                newAttributes.push(t.jSXAttribute(
                    t.jSXIdentifier(nodeNameAttr),
                    t.stringLiteral(path.container.openingElement.name.name))
                );
            }

            if (state.file && state.file.opts && state.file.opts.basename) {
                const name = state.file.opts.basename;

                newAttributes.push(t.jSXAttribute(
                    t.jSXIdentifier(filenameAttr),
                    t.stringLiteral(name))
                );
            }

            attributes.push(...newAttributes);
        },
        CallExpression(path, state) {
            if (path.node.callee.type === 'MemberExpression'
                && path.node.callee.object.name === 'React'
                && path.node.callee.property.name === 'createElement'
                || path.node.callee.type === 'Identifier'
                && path.node.callee.name === 'createElement') {
                const name = state.file.opts.basename;

                path.node.arguments[1] && path.node.arguments[1].properties
                && path.node.arguments[1].properties.push(
                    t.objectProperty(
                        t.stringLiteral(filenameAttr),
                        t.stringLiteral(name)
                    )
                );
            }
        }
    };

    return {
        visitor
    };
}
