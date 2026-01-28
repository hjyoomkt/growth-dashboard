import React from "react";
import ReactApexChart from "react-apexcharts";

class DonutChart extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      chartData: [],
      chartOptions: {},
    };
  }

  componentDidMount() {
    this.setState({
      chartData: this.props.chartData,
      chartOptions: this.props.chartOptions,
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.chartData !== this.props.chartData || prevProps.chartOptions !== this.props.chartOptions) {
      // 빈 데이터 검증: 유효한 데이터만 setState
      const hasValidData = this.props.chartData &&
                           Array.isArray(this.props.chartData) &&
                           this.props.chartData.length > 0 &&
                           this.props.chartData.every(val => typeof val === 'number' && !Number.isNaN(val) && val >= 0);

      if (hasValidData) {
        this.setState({
          chartData: this.props.chartData,
          chartOptions: this.props.chartOptions,
        });
      }
    }
  }

  render() {
    const hasData = this.state.chartData &&
                     Array.isArray(this.state.chartData) &&
                     this.state.chartData.length > 0 &&
                     this.state.chartData.some(val => val > 0);

    if (!hasData) {
      return null;
    }

    return (
      <ReactApexChart
        options={this.state.chartOptions}
        series={this.state.chartData}
        type='donut'
        width='100%'
        height='100%'
      />
    );
  }
}

export default DonutChart;
