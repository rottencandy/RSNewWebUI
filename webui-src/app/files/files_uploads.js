let m = require('mithril');
let rs = require('rswebui');
let util = require('files/files_util')


function updateFileDetail(hash, isNew = false) {
  rs.rsJsonApiRequest(
    '/rsFiles/FileDetails', {
      hash,
      hintflags: 32, // RS_FILE_HINTS_UPLOAD
    },
    (fileStat) => {
      if(!fileStat.retval) {
        console.error('Error: Unknown hash in Uploads: ', hash);
        return;
      }
      fileStat.info.isSearched = (isNew ?
        true :
        Uploads.statusMap[hash].isSearched);
      Uploads.statusMap[hash] = fileStat.info;
    },
  );
}

let Uploads = {
  statusMap: {},
  hashes: [],

  loadHashes() {
    rs.rsJsonApiRequest(
      '/rsFiles/FileUploads', {},
      (d) => Uploads.hashes = d.hashs,
    );
  },

  loadStatus() {
    Uploads.loadHashes();
    let fileKeys = Object.keys(Uploads.statusMap);
    if(Uploads.hashes.length !== fileKeys.length) {
      // New file added
      if(Uploads.hashes.length > fileKeys.length) {
        let newHashes = util.compareArrays(Uploads.hashes, fileKeys);
        for(let hash of newHashes) {
          updateFileDetail(hash, true);
        }
      }
      // Existing file removed
      else {
        let oldHashes = util.compareArrays(fileKeys, Uploads.hashes);
        for(let hash of oldHashes) {
          delete Uploads.statusMap[hash];
        }
      }
    }
    for(let hash in Uploads.statusMap) {
      updateFileDetail(hash);
    }
  },
};

function averageOf(peers){
   return peers.reduce( (s,e) => s + e.transfered.xint64, 0) / peers.length;
}

const Component = () => {
  return {
    oninit: () => rs.setBackgroundTask(
      Uploads.loadStatus,
      1000,
      () => {
        return (m.route.get() === '/files/files')
      }
    ),
    view: () => (Uploads.hashes.length > 0 ? m('.widget', [
      m('h3', 'Uploads ('+ Uploads.hashes.length +' files)'),
      m('hr'),
      Object.keys(Uploads.statusMap).map(
        (hash) => (m(util.File, {
          info: Uploads.statusMap[hash],
          direction: 'up',
          transferred: averageOf(Uploads.statusMap[hash].peers),
          parts: Uploads.statusMap[hash].peers.reduce((a,e) => [...a, e.transfered.xint64], []),
        }))
      ),
    ]) : [])
  };
};

module.exports = {
  Component,
  list: Uploads.statusMap
};

