import React, { useEffect, useRef, useState } from 'react';
import { Pagination } from 'swiper/modules';
import './App.css';

import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import { useTable } from 'react-table';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

function App() {
    const [imageElements, setImageElements] = useState([]);
    const [data, setData] = useState([]);
    const refs = useRef([]);

    useEffect(() => {
        imageElements.forEach((_, index) => {
            if (refs.current[index]) {
                cornerstone.enable(refs.current[index]);
            }
        });
    }, [imageElements]);

    const fileInput = useRef();
    const folderInput = useRef();

    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            const newImageIds = [];
            const newData = [];
            const fileReaders = Array.from(files).map((file) => {
                return new Promise((resolve) => {
                    const fileReader = new FileReader();
                    fileReader.onload = function (e) {
                        const arrayBuffer = e.target.result;
                        const uint8Array = new Uint8Array(arrayBuffer);
                        try {
                            const dataSet = dicomParser.parseDicom(uint8Array);
                            const headerInfo = {
                                fileName: file.name,
                                patientName:
                                    dataSet.string('x00100010') || 'N/A',
                                modality: dataSet.string('x00080060') || 'N/A',
                            };
                            newData.push(headerInfo);
                        } catch (error) {
                            console.error('Error parsing DICOM file:', error);
                        }
                        const imageId =
                            cornerstoneWADOImageLoader.wadouri.fileManager.add(
                                file
                            );
                        newImageIds.push(imageId);
                        resolve();
                    };
                    fileReader.readAsArrayBuffer(file);
                });
            });

            Promise.all(fileReaders)
                .then(() => {
                    setData(newData);
                    setImageElements(newImageIds);
                    refs.current = newImageIds.map(() => React.createRef());
                })
                .catch((err) => {
                    console.error('Error reading files:', err);
                });
        }
    };

    const displayImages = () => {
        imageElements.forEach((imageId, index) => {
            cornerstone
                .loadImage(imageId)
                .then((image) => {
                    if (refs.current[index]) {
                        cornerstone.displayImage(refs.current[index], image);
                    }
                })
                .catch((err) => {
                    console.error('Error loading DICOM image:', err);
                });
        });
    };

    useEffect(() => {
        displayImages();
    }, [imageElements]);

    const columns = React.useMemo(
        () => [
            {
                Header: 'File Name',
                accessor: 'fileName',
            },
            {
                Header: 'Patient Name',
                accessor: 'patientName',
            },
            {
                Header: 'Modality',
                accessor: 'modality',
            },
        ],
        []
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        useTable({ columns, data });

    return (
        <div className="p-5 md:p-10 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-5">
                <div
                    onClick={() => {
                        fileInput.current.click();
                    }}
                    className="w-full h-40 border border-dashed border-gray-500 flex items-center justify-center cursor-pointer text-xl rounded-lg"
                >
                    Select files
                </div>

                <div
                    onClick={() => {
                        folderInput.current.click();
                    }}
                    className="w-full h-40 border border-dashed border-gray-500 flex items-center justify-center cursor-pointer text-xl rounded-lg"
                >
                    Select folder
                </div>
            </div>
            <input
                ref={folderInput}
                type="file"
                hidden
                multiple
                webkitdirectory="true"
                mozdirectory="true"
                directory="true"
                onChange={handleFileChange}
            />
            <input
                ref={fileInput}
                type="file"
                hidden
                multiple
                accept=".dcm"
                onChange={handleFileChange}
            />
            <Swiper
                spaceBetween={20}
                navigation
                pagination={{ clickable: true }}
                modules={[Pagination]}
                className="mt-10 !overflow-visible"
                breakpoints={{
                    0: {
                        slidesPerView: 1,
                    },
                    768: {
                        slidesPerView: 2,
                    },
                }}
            >
                {imageElements.map((_, index) => (
                    <SwiperSlide key={index}>
                        <div ref={(el) => (refs.current[index] = el)}></div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {!!rows.length && (
                <table {...getTableProps()} className="table-auto w-full mt-20">
                    <thead>
                        {headerGroups.map((headerGroup) => (
                            <tr {...headerGroup.getHeaderGroupProps()}>
                                {headerGroup.headers.map((column) => (
                                    <th
                                        {...column.getHeaderProps()}
                                        className="border px-4 py-2"
                                    >
                                        {column.render('Header')}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody {...getTableBodyProps()}>
                        {rows.map((row) => {
                            prepareRow(row);
                            return (
                                <tr {...row.getRowProps()}>
                                    {row.cells.map((cell) => (
                                        <td
                                            {...cell.getCellProps()}
                                            className="border px-4 py-2"
                                        >
                                            {cell.render('Cell')}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default App;
